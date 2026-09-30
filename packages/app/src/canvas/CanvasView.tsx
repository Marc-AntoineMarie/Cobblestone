import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Copy, FilePlus, Group, Maximize, Minus, Plus, SquarePlus, Trash2 } from 'lucide-react';
import { extname, parseCanvas, serializeCanvas, type CanvasData, type CanvasNode, type CanvasSide } from '@cobblestone/core';
import { t } from '../i18n';
import { useSession } from '../ui/hooks';
import { CanvasCard } from './CanvasCard';
import {
  arrowHead,
  bounds,
  edgeEnds,
  edgeMidpoint,
  edgePath,
  facingSide,
  fitViewport,
  GRID,
  intersects,
  toWorld,
  zoomAt,
  type Point,
  type Rect,
  type Viewport,
} from './geometry';
import {
  addEdge,
  addNode,
  colorValue,
  duplicate,
  History,
  moveNodes,
  newFileNode,
  newGroupNode,
  newTextNode,
  PRESET_COLORS,
  removeItems,
  resizeNode,
  setColor,
  updateEdge,
  updateNode,
} from './model';

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);

interface Selection {
  nodes: Set<string>;
  edges: Set<string>;
}

const EMPTY: Selection = { nodes: new Set(), edges: new Set() };

type Gesture =
  | { kind: 'pan'; start: Point; view: Viewport; moved: boolean }
  | { kind: 'move'; start: Point; data: CanvasData; ids: Set<string>; moved: boolean }
  | { kind: 'resize'; start: Point; data: CanvasData; node: CanvasNode }
  | { kind: 'band'; start: Point; additive: boolean }
  | { kind: 'connect'; from: CanvasNode; side: CanvasSide };

/** An Obsidian-compatible canvas: cards, notes and images on an infinite sheet, linked by arrows. */
export function CanvasView({ path, visible }: { path: string; visible: boolean }) {
  const session = useSession();
  const [data, setData] = useState<CanvasData | null>(null);
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [selection, setSelection] = useState<Selection>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingEdge, setEditingEdge] = useState<string | null>(null);
  const [band, setBand] = useState<Rect | null>(null);
  const [wire, setWire] = useState<{ from: Point; side: CanvasSide; to: Point } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const history = useRef(new History());
  const dataRef = useRef<CanvasData | null>(null);
  const viewRef = useRef(view);
  const lastSaved = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fitted = useRef(false);
  dataRef.current = data;
  viewRef.current = view;

  // ------------------------------------------------------------ load & save

  useEffect(() => {
    let cancelled = false;
    const load = (text: string) => {
      if (text === lastSaved.current) return;
      lastSaved.current = text;
      setData(parseCanvas(text));
    };
    void session.vault.read(path).then((text) => !cancelled && load(text));
    // Another app or device changed the file: take its version unless we are in the middle of a gesture.
    const off = session.vault.on('modify', (file, content) => {
      if (file.path !== path || gesture.current) return;
      if (content !== null) load(content);
      else void session.vault.read(path).then((text) => !cancelled && load(text));
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [session, path]);

  const flush = useCallback(() => {
    clearTimeout(saveTimer.current);
    const current = dataRef.current;
    if (!current) return;
    const text = serializeCanvas(current);
    if (text === lastSaved.current || !session.vault.getFile(path)) return;
    lastSaved.current = text;
    void session.vault.modify(path, text);
  }, [session, path]);

  useEffect(() => () => flush(), [flush]);

  /** Applies a change; `record` adds the previous state to the undo history. */
  const commit = useCallback(
    (next: CanvasData, record = true) => {
      const previous = dataRef.current;
      if (record && previous) history.current.push(previous);
      dataRef.current = next;
      setData(next);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  // Show everything the first time the canvas is displayed.
  useEffect(() => {
    if (!data || fitted.current || !visible || !root.current) return;
    const rect = root.current.getBoundingClientRect();
    if (rect.width === 0) return;
    fitted.current = true;
    setView(fitViewport(bounds(data.nodes), rect.width, rect.height));
  }, [data, visible]);

  const fit = () => {
    const rect = root.current?.getBoundingClientRect();
    if (rect && data) setView(fitViewport(bounds(data.nodes), rect.width, rect.height));
  };

  const screenPoint = (event: { clientX: number; clientY: number }): Point => {
    const rect = root.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const worldPoint = (event: { clientX: number; clientY: number }) => toWorld(viewRef.current, screenPoint(event));

  const nodeById = useMemo(() => new Map((data?.nodes ?? []).map((n) => [n.id, n])), [data]);

  // ------------------------------------------------------------ gestures

  const startGesture = (next: Gesture) => {
    gesture.current = next;
  };

  /**
   * Keeps the pointer once a drag is under way. Not before: a captured pointer
   * sends clicks and double-clicks to the sheet instead of the card or link under it.
   */
  const capture = (event: ReactPointerEvent) => {
    if (!root.current?.hasPointerCapture(event.pointerId)) root.current?.setPointerCapture(event.pointerId);
  };

  const onBackgroundDown = (event: ReactPointerEvent) => {
    if (event.button !== 0 && event.button !== 1) return;
    root.current?.focus();
    setEditingEdge(null);
    if (event.shiftKey && event.button === 0) {
      startGesture({ kind: 'band', start: worldPoint(event), additive: true });
      return;
    }
    startGesture({ kind: 'pan', start: screenPoint(event), view: viewRef.current, moved: false });
  };

  const onNodeDown = (event: ReactPointerEvent, node: CanvasNode) => {
    if (event.button !== 0 || editing === node.id) return;
    event.stopPropagation();
    root.current?.focus();
    setEditingEdge(null);
    let ids = selection.nodes;
    if (event.shiftKey) {
      ids = new Set(ids);
      if (ids.has(node.id)) ids.delete(node.id);
      else ids.add(node.id);
      setSelection({ nodes: ids, edges: new Set() });
    } else if (!ids.has(node.id)) {
      ids = new Set([node.id]);
      setSelection({ nodes: ids, edges: new Set() });
    }
    if (data && ids.has(node.id)) startGesture({ kind: 'move', start: worldPoint(event), data, ids, moved: false });
  };

  const onResizeStart = (event: ReactPointerEvent, node: CanvasNode) => {
    if (data) startGesture({ kind: 'resize', start: worldPoint(event), data, node });
  };

  const onConnectStart = (event: ReactPointerEvent, node: CanvasNode, side: CanvasSide) => {
    startGesture({ kind: 'connect', from: node, side });
    const start = { x: node.x, y: node.y, width: node.width, height: node.height };
    const from = edgeEnds({ id: '', fromNode: '', toNode: '', fromSide: side, toSide: side }, start, start).start;
    setWire({ from, side, to: worldPoint(event) });
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pan') {
      const p = screenPoint(event);
      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) g.moved = true;
      if (g.moved) capture(event);
      setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
    } else if (g.kind === 'move') {
      const p = worldPoint(event);
      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      if (!g.moved && Math.abs(dx) + Math.abs(dy) < 3 / viewRef.current.zoom) return;
      g.moved = true;
      capture(event);
      commit(moveNodes(g.data, g.ids, dx, dy, !event.altKey), false);
    } else if (g.kind === 'resize') {
      capture(event);
      const p = worldPoint(event);
      commit(resizeNode(g.data, g.node.id, g.node.width + p.x - g.start.x, g.node.height + p.y - g.start.y), false);
    } else if (g.kind === 'band') {
      capture(event);
      const p = worldPoint(event);
      setBand({
        x: Math.min(p.x, g.start.x),
        y: Math.min(p.y, g.start.y),
        width: Math.abs(p.x - g.start.x),
        height: Math.abs(p.y - g.start.y),
      });
    } else if (g.kind === 'connect') {
      capture(event);
      setWire((w) => (w ? { ...w, to: worldPoint(event) } : w));
    }
  };

  const onPointerUp = (event: ReactPointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.kind === 'pan' && !g.moved) setSelection(EMPTY);
    if ((g.kind === 'move' && g.moved) || g.kind === 'resize') {
      if (dataRef.current !== g.data) history.current.push(g.data);
    }
    if (g.kind === 'band' && band && data) {
      const inside = data.nodes.filter((n) => intersects(band, n)).map((n) => n.id);
      setSelection({ nodes: new Set([...(g.additive ? selection.nodes : []), ...inside]), edges: new Set() });
      setBand(null);
    }
    if (g.kind === 'connect') {
      setWire(null);
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-node-id]');
      const to = target ? nodeById.get(target.dataset.nodeId!) : undefined;
      if (to && data && to.id !== g.from.id) commit(addEdge(data, g.from.id, g.side, to.id, facingSide(to, worldPoint(event))));
    }
  };

  const onWheel = (event: React.WheelEvent) => {
    // Let scrollable card contents scroll; everything else pans, and Ctrl/pinch zooms.
    const body = (event.target as HTMLElement).closest('.canvas-body');
    if (body && !event.ctrlKey && body.scrollHeight > body.clientHeight) return;
    if (event.ctrlKey || event.metaKey) setView((v) => zoomAt(v, screenPoint(event), Math.exp(-event.deltaY * 0.01)));
    else setView((v) => ({ ...v, x: v.x - event.deltaX, y: v.y - event.deltaY }));
  };

  // Wheel events must be cancelable (React's are passive).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => {
      const body = (e.target as HTMLElement).closest('.canvas-body');
      if (!body || e.ctrlKey || body.scrollHeight <= body.clientHeight) e.preventDefault();
    };
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  // ------------------------------------------------------------ actions

  const addCard = (at?: Point) => {
    if (!data) return;
    const rect = root.current!.getBoundingClientRect();
    const p = at ?? toWorld(view, { x: rect.width / 2 - 130, y: rect.height / 2 - 70 });
    const node = newTextNode(p.x, p.y);
    commit(addNode(data, node));
    setSelection({ nodes: new Set([node.id]), edges: new Set() });
    setEditing(node.id);
  };

  const addFiles = (paths: string[], at: Point) => {
    let next = dataRef.current;
    if (!next) return;
    const ids: string[] = [];
    paths.forEach((file, i) => {
      const node = newFileNode(at.x + i * 40, at.y + i * 40, file, IMAGE.has(extname(file)));
      ids.push(node.id);
      next = addNode(next!, node);
    });
    commit(next);
    setSelection({ nodes: new Set(ids), edges: new Set() });
  };

  const pickNote = () => {
    const rect = root.current!.getBoundingClientRect();
    const at = toWorld(view, { x: rect.width / 2 - 200, y: rect.height / 2 - 200 });
    session.ui.setState({
      finder: {
        mode: 'pick',
        placeholder: t('canvas.pickFile'),
        items: session.vault
          .getFiles()
          .filter((f) => f.extension === 'md' || IMAGE.has(f.extension))
          .map((f) => ({ id: f.path, label: f.extension === 'md' ? f.basename : f.name, detail: f.parent || undefined })),
        onPick: (file) => addFiles([file], at),
      },
    });
  };

  const groupSelection = () => {
    if (!data) return;
    const chosen = data.nodes.filter((n) => selection.nodes.has(n.id));
    const box = bounds(chosen);
    if (!box) return;
    const group = newGroupNode(box.x - GRID * 2, box.y - GRID * 3, box.width + GRID * 4, box.height + GRID * 5);
    commit(addNode(data, group));
    setSelection({ nodes: new Set([group.id]), edges: new Set() });
    setEditing(group.id);
  };

  const removeSelection = () => {
    if (!data || (selection.nodes.size === 0 && selection.edges.size === 0)) return;
    commit(removeItems(data, selection.nodes, selection.edges));
    setSelection(EMPTY);
  };

  const duplicateSelection = () => {
    if (!data || selection.nodes.size === 0) return;
    const copy = duplicate(data, selection.nodes);
    commit(copy.data);
    setSelection({ nodes: copy.ids, edges: new Set() });
  };

  const undo = () => {
    if (!data) return;
    const previous = history.current.undo(data);
    if (previous) commit(previous, false);
  };

  const redo = () => {
    if (!data) return;
    const next = history.current.redo(data);
    if (next) commit(next, false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (editing || editingEdge) return;
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (key === 'delete' || key === 'backspace') removeSelection();
    else if (mod && key === 'z' && !event.shiftKey) undo();
    else if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) redo();
    else if (mod && key === 'd') duplicateSelection();
    else if (mod && key === 'a') setSelection({ nodes: new Set(data?.nodes.map((n) => n.id)), edges: new Set() });
    else if (mod && key === 'g') groupSelection();
    else if (key === 'escape') setSelection(EMPTY);
    else if (key === 'enter' && selection.nodes.size === 1) setEditing([...selection.nodes][0]!);
    else if (key.startsWith('arrow') && data && selection.nodes.size) {
      const step = event.shiftKey ? 1 : GRID;
      const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
      const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
      commit(moveNodes(data, selection.nodes, dx, dy, !event.shiftKey));
    } else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const onDrop = (event: React.DragEvent) => {
    const dragged = event.dataTransfer.getData('application/x-cobblestone-path');
    const at = worldPoint(event);
    if (dragged) {
      event.preventDefault();
      addFiles([dragged], at);
      return;
    }
    const files = [...event.dataTransfer.files];
    if (files.length) {
      event.preventDefault();
      // Dropped files are saved as attachments of the canvas, then placed on it.
      void Promise.all(files.map((file) => session.saveAttachment(file, path).then((embed) => embed.slice(3, -2))))
        .then((links) => links.map((link) => session.vault.cache.resolve(link, path)).filter((p): p is string => !!p))
        .then((paths) => addFiles(paths, at));
    }
  };

  const handlers = {
    onPointerDown: onNodeDown,
    onResizeStart,
    onConnectStart,
    onEdit: (node: CanvasNode) => {
      if (node.type === 'file') {
        session.openPath(node.file, 'current', node.subpath);
        return;
      }
      if (node.type !== 'text' && node.type !== 'group') return;
      if (dataRef.current) history.current.push(dataRef.current);
      setEditing(node.id);
    },
    onText: (node: CanvasNode, text: string) => dataRef.current && commit(updateNode(dataRef.current, node.id, { text }), false),
    onLabel: (node: CanvasNode, label: string) =>
      dataRef.current && commit(updateNode(dataRef.current, node.id, { label }), false),
    onStopEditing: () => {
      setEditing(null);
      root.current?.focus();
    },
  };

  // ------------------------------------------------------------ render

  if (!data) return <div className="canvas-view" />;

  const selectedColor = (() => {
    const items = [
      ...data.nodes.filter((n) => selection.nodes.has(n.id)),
      ...data.edges.filter((e) => selection.edges.has(e.id)),
    ];
    return items.length && items.every((i) => i.color === items[0]!.color) ? (items[0]!.color ?? null) : undefined;
  })();
  const content = bounds(data.nodes) ?? { x: 0, y: 0, width: 1, height: 1 };
  const svgBox = { x: content.x - 2000, y: content.y - 2000, width: content.width + 4000, height: content.height + 4000 };
  const groups = data.nodes.filter((n) => n.type === 'group');
  const cards = data.nodes.filter((n) => n.type !== 'group');
  const gridSize = GRID * view.zoom;

  return (
    <div
      className="canvas-view"
      ref={root}
      tabIndex={0}
      role="application"
      aria-label={path}
      style={{
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      onPointerDown={onBackgroundDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-node-id], .canvas-toolbar, .canvas-edge-label')) return;
        addCard(worldPoint(e));
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="canvas-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        {groups.map((node) => (
          <CanvasCard
            key={node.id}
            node={node}
            session={session}
            canvasPath={path}
            selected={selection.nodes.has(node.id)}
            editing={editing === node.id}
            {...handlers}
          />
        ))}
        <svg
          className="canvas-edges"
          style={{ left: svgBox.x, top: svgBox.y, width: svgBox.width, height: svgBox.height }}
          viewBox={`${svgBox.x} ${svgBox.y} ${svgBox.width} ${svgBox.height}`}
        >
          {data.edges.map((edge) => {
            const from = nodeById.get(edge.fromNode);
            const to = nodeById.get(edge.toNode);
            if (!from || !to) return null;
            const { fromSide, toSide, start, end } = edgeEnds(edge, from, to);
            const d = edgePath(start, fromSide, end, toSide);
            const selected = selection.edges.has(edge.id);
            const ink = colorValue(edge.color);
            const select = (e: React.PointerEvent) => {
              e.stopPropagation();
              root.current?.focus();
              setSelection({ nodes: new Set(), edges: new Set([edge.id]) });
            };
            return (
              <g
                key={edge.id}
                className={`canvas-edge${selected ? ' is-selected' : ''}`}
                style={ink ? ({ '--edge-ink': ink } as React.CSSProperties) : undefined}
              >
                <path
                  className="canvas-edge-hit"
                  d={d}
                  onPointerDown={select}
                  onDoubleClick={(e) => (e.stopPropagation(), setEditingEdge(edge.id))}
                />
                <path className="canvas-edge-line" d={d} />
                {(edge.toEnd ?? 'arrow') === 'arrow' && <polygon className="canvas-edge-arrow" points={arrowHead(end, toSide)} />}
                {edge.fromEnd === 'arrow' && <polygon className="canvas-edge-arrow" points={arrowHead(start, fromSide)} />}
              </g>
            );
          })}
          {wire && <path className="canvas-edge-line is-wire" d={edgePath(wire.from, wire.side, wire.to, null)} />}
        </svg>
        {data.edges.map((edge) => {
          const from = nodeById.get(edge.fromNode);
          const to = nodeById.get(edge.toNode);
          if (!from || !to || (!edge.label && editingEdge !== edge.id)) return null;
          const { fromSide, toSide, start, end } = edgeEnds(edge, from, to);
          const mid = edgeMidpoint(start, fromSide, end, toSide);
          return (
            <div
              key={edge.id}
              className="canvas-edge-label"
              style={{ transform: `translate(${mid.x}px, ${mid.y}px) translate(-50%, -50%)` }}
            >
              {editingEdge === edge.id ? (
                <input
                  autoFocus
                  defaultValue={edge.label ?? ''}
                  placeholder={t('canvas.edgeLabel')}
                  onPointerDown={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const label = e.currentTarget.value.trim();
                    const { label: _old, ...rest } = edge;
                    commit(
                      label
                        ? updateEdge(data, edge.id, { label })
                        : { ...data, edges: data.edges.map((x) => (x.id === edge.id ? rest : x)) },
                    );
                    setEditingEdge(null);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                  }}
                />
              ) : (
                <span onDoubleClick={() => setEditingEdge(edge.id)}>{edge.label}</span>
              )}
            </div>
          );
        })}
        {cards.map((node) => (
          <CanvasCard
            key={node.id}
            node={node}
            session={session}
            canvasPath={path}
            selected={selection.nodes.has(node.id)}
            editing={editing === node.id}
            {...handlers}
          />
        ))}
        {band && (
          <div
            className="canvas-band"
            style={{ transform: `translate(${band.x}px, ${band.y}px)`, width: band.width, height: band.height }}
          />
        )}
      </div>

      {data.nodes.length === 0 && <p className="canvas-empty">{t('canvas.empty')}</p>}

      <div className="canvas-toolbar" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <button className="icon-button" onClick={() => addCard()} title={t('canvas.addCard')} aria-label={t('canvas.addCard')}>
          <SquarePlus size={17} strokeWidth={1.75} />
        </button>
        <button className="icon-button" onClick={pickNote} title={t('canvas.addNote')} aria-label={t('canvas.addNote')}>
          <FilePlus size={17} strokeWidth={1.75} />
        </button>
        <span className="canvas-toolbar-rule" />
        <button
          className="icon-button"
          onClick={() => setView((v) => zoomAt(v, centerOf(root.current), 1 / 1.25))}
          title={t('canvas.zoomOut')}
          aria-label={t('canvas.zoomOut')}
        >
          <Minus size={17} strokeWidth={1.75} />
        </button>
        <span className="canvas-zoom">{Math.round(view.zoom * 100)} %</span>
        <button
          className="icon-button"
          onClick={() => setView((v) => zoomAt(v, centerOf(root.current), 1.25))}
          title={t('canvas.zoomIn')}
          aria-label={t('canvas.zoomIn')}
        >
          <Plus size={17} strokeWidth={1.75} />
        </button>
        <button className="icon-button" onClick={fit} title={t('canvas.fit')} aria-label={t('canvas.fit')}>
          <Maximize size={16} strokeWidth={1.75} />
        </button>
      </div>

      {(selection.nodes.size > 0 || selection.edges.size > 0) && !editing && (
        <div
          className="canvas-selection-bar"
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button
            className={`canvas-swatch is-none${selectedColor === null ? ' is-current' : ''}`}
            title={t('canvas.noColor')}
            aria-label={t('canvas.noColor')}
            onClick={() => commit(setColor(data, selection.nodes, selection.edges, null))}
          />
          {Object.entries(PRESET_COLORS).map(([key, ink]) => (
            <button
              key={key}
              className={`canvas-swatch${selectedColor === key ? ' is-current' : ''}`}
              style={{ background: ink }}
              title={`${t('canvas.color')} ${key}`}
              aria-label={`${t('canvas.color')} ${key}`}
              onClick={() => commit(setColor(data, selection.nodes, selection.edges, key))}
            />
          ))}
          <span className="canvas-toolbar-rule" />
          {selection.nodes.size > 0 && (
            <>
              <button className="icon-button" onClick={groupSelection} title={t('canvas.group')} aria-label={t('canvas.group')}>
                <Group size={16} strokeWidth={1.75} />
              </button>
              <button
                className="icon-button"
                onClick={duplicateSelection}
                title={t('canvas.duplicate')}
                aria-label={t('canvas.duplicate')}
              >
                <Copy size={16} strokeWidth={1.75} />
              </button>
            </>
          )}
          <button className="icon-button" onClick={removeSelection} title={t('canvas.delete')} aria-label={t('canvas.delete')}>
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}

function centerOf(element: HTMLElement | null): Point {
  const rect = element?.getBoundingClientRect();
  return rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 };
}
