import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { RotateCcw } from 'lucide-react';
import { stem } from '@cobblestone/core';
import { t } from '../i18n';
import { fold } from './fuzzy';
import { useSession, useVaultRevision } from './hooks';
import { usePreferences } from './preferences';

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  kind: 'note' | 'attachment' | 'unresolved';
  degree: number;
  radius: number;
}
type GraphLink = SimulationLinkDatum<GraphNode> & { source: string | GraphNode; target: string | GraphNode };

interface Options {
  query: string;
  orphans: boolean;
  attachments: boolean;
  unresolved: boolean;
  depth: number;
}

/**
 * What the graph drew last, in screen coordinates of its canvas. A canvas has
 * no elements to inspect: the recette tests read the drawing through this.
 */
export interface GraphProbe {
  view: { x: number; y: number; k: number };
  width: number;
  height: number;
  /** True while the layout is still settling. */
  moving: boolean;
  hovered: string | null;
  nodes: {
    id: string;
    kind: GraphNode['kind'];
    degree: number;
    radius: number;
    /** World position, as pins are saved. */
    x: number;
    y: number;
    /** Position on the canvas. */
    sx: number;
    sy: number;
    pinned: boolean;
    dimmed: boolean;
    labelled: boolean;
  }[];
  links: { source: string; target: string; lit: boolean }[];
}

/** Deterministic pseudo-random numbers, so the same vault lays out the same way. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** How long a click on a pinned note waits for a second one. */
const DOUBLE_CLICK_MS = 300;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function readInks() {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    ink: v('--ink'),
    ink2: v('--ink-2'),
    ink3: v('--ink-3'),
    paper: v('--paper'),
    accent: v('--accent'),
    yellow: v('--yellow'),
    rule: v('--rule-strong'),
    night: document.documentElement.dataset.paper === 'night',
  };
}

export function GraphView({ focus, visible }: { focus?: string; visible: boolean }) {
  const session = useSession();
  const revision = useVaultRevision();
  const { paper, theme, preferences } = usePreferences();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [options, setOptions] = useState<Options>({ query: '', orphans: true, attachments: false, unresolved: false, depth: 1 });
  const pinsKey = `graph-pins:${session.entry.id}`;
  const [pins, setPins] = useState<Record<string, [number, number]>>({});
  const [pinsLoaded, setPinsLoaded] = useState(false);

  useEffect(() => {
    void session.platform.storage.get<Record<string, [number, number]>>(pinsKey).then((stored) => {
      setPins(stored ?? {});
      setPinsLoaded(true);
    });
  }, [session, pinsKey]);

  const data = useMemo(() => {
    void revision;
    const cache = session.vault.cache;
    const nodes = new Map<string, GraphNode>();
    const add = (id: string, kind: GraphNode['kind']) => {
      if (!nodes.has(id)) nodes.set(id, { id, label: kind === 'unresolved' ? id : stem(id), kind, degree: 0, radius: 4 });
      return nodes.get(id)!;
    };
    for (const file of session.vault.getFiles()) {
      if (file.extension === 'md') add(file.path, 'note');
      else if (options.attachments && file.extension !== 'canvas') add(file.path, 'attachment');
    }
    const links: GraphLink[] = [];
    for (const [source, targets] of cache.resolvedLinks) {
      if (!nodes.has(source)) continue;
      for (const target of targets.keys()) {
        if (target === source || !nodes.has(target)) continue;
        links.push({ source, target });
      }
    }
    if (options.unresolved) {
      for (const [source, targets] of cache.unresolvedLinks) {
        if (!nodes.has(source)) continue;
        for (const target of targets.keys()) {
          add(target, 'unresolved');
          links.push({ source, target });
        }
      }
    }
    for (const link of links) {
      nodes.get(link.source as string)!.degree++;
      nodes.get(link.target as string)!.degree++;
    }

    let keep = new Set(nodes.keys());
    if (focus && nodes.has(focus)) {
      keep = new Set([focus]);
      let frontier = [focus];
      for (let d = 0; d < options.depth; d++) {
        const next: string[] = [];
        for (const link of links) {
          const s = link.source as string;
          const tg = link.target as string;
          if (frontier.includes(s) && !keep.has(tg)) next.push(tg);
          if (frontier.includes(tg) && !keep.has(s)) next.push(s);
        }
        next.forEach((n) => keep.add(n));
        frontier = next;
      }
    }
    if (!options.orphans) for (const node of nodes.values()) if (node.degree === 0 && node.id !== focus) keep.delete(node.id);
    if (options.query.trim()) {
      const q = fold(options.query.trim());
      for (const id of [...keep]) if (!fold(nodes.get(id)!.label).includes(q) && id !== focus) keep.delete(id);
    }

    const finalNodes = [...keep].map((id) => {
      const node = nodes.get(id)!;
      node.radius = 4.5 + Math.sqrt(node.degree) * 2.2;
      return node;
    });
    const finalLinks = links.filter((l) => keep.has(l.source as string) && keep.has(l.target as string));
    return { nodes: finalNodes, links: finalLinks };
  }, [session, revision, options, focus]);

  // Read the inks after the paper and theme have been applied to the document.
  const [inks, setInks] = useState(readInks);
  useEffect(() => {
    // Same inks, same object: the layout is not started again for nothing.
    const frame = requestAnimationFrame(() =>
      setInks((previous) => {
        const next = readInks();
        return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [paper, theme, preferences.colorOverrides]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pinsLoaded || !visible) return;
    const context = canvas.getContext('2d')!;
    const nodes: GraphNode[] = data.nodes.map((n) => {
      const r = seeded(hash(n.id));
      const pin = pins[n.id];
      const angle = r() * Math.PI * 2;
      const dist = 40 + r() * 260;
      return { ...n, x: pin?.[0] ?? Math.cos(angle) * dist, y: pin?.[1] ?? Math.sin(angle) * dist, fx: pin?.[0], fy: pin?.[1] };
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links = data.links.map((l) => ({ source: byId.get(l.source as string)!, target: byId.get(l.target as string)! }));
    const neighbours = new Map<string, Set<string>>();
    for (const l of links) {
      if (!neighbours.has(l.source.id)) neighbours.set(l.source.id, new Set());
      if (!neighbours.has(l.target.id)) neighbours.set(l.target.id, new Set());
      neighbours.get(l.source.id)!.add(l.target.id);
      neighbours.get(l.target.id)!.add(l.source.id);
    }

    let view = { x: 0, y: 0, k: 1 };
    // Until the reader pans or zooms, the view keeps the whole graph in frame.
    let userMoved = false;
    let ticks = 0;
    let hovered: GraphNode | null = null;
    let dragging: GraphNode | null = null;
    let panning: { x: number; y: number; vx: number; vy: number } | null = null;
    let moved = false;
    let opening: ReturnType<typeof setTimeout> | undefined;
    let width = 0;
    let height = 0;
    const dpr = window.devicePixelRatio || 1;

    const halftone = (() => {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 4 * dpr;
      const tc = tile.getContext('2d')!;
      tc.fillStyle = inks.ink2;
      tc.beginPath();
      tc.arc(1 * dpr, 1 * dpr, 0.9 * dpr, 0, Math.PI * 2);
      tc.arc(3 * dpr, 3 * dpr, 0.9 * dpr, 0, Math.PI * 2);
      tc.fill();
      return context.createPattern(tile, 'repeat');
    })();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw();
    };

    const simulation: Simulation<GraphNode, undefined> = forceSimulation(nodes)
      .randomSource(seeded(7))
      .force('link', forceLink(links).distance(64).strength(0.35))
      .force('charge', forceManyBody().strength(-110).distanceMax(420))
      .force('center', forceCenter(0, 0).strength(0.04))
      .force(
        'collide',
        forceCollide<GraphNode>((n) => n.radius + 3),
      )
      .alphaDecay(0.03)
      .on('tick', () => {
        ticks++;
        if (!userMoved && ticks % 15 === 0) fit();
        draw();
      })
      .on('end', () => {
        if (!userMoved) fit();
      });

    function fit() {
      if (!nodes.length || !width) return;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const node of nodes) {
        minX = Math.min(minX, node.x! - node.radius - 40);
        maxX = Math.max(maxX, node.x! + node.radius + 40);
        minY = Math.min(minY, node.y! - node.radius - 10);
        maxY = Math.max(maxY, node.y! + node.radius + 26);
      }
      const k = Math.min(1.8, Math.max(0.15, Math.min((width - 48) / (maxX - minX), (height - 72) / (maxY - minY))));
      view = { k, x: -((minX + maxX) / 2) * k, y: -((minY + maxY) / 2) * k };
    }

    const toWorld = (sx: number, sy: number) => ({
      x: (sx - width / 2 - view.x) / view.k,
      y: (sy - height / 2 - view.y) / view.k,
    });

    const nodeAt = (sx: number, sy: number) => {
      const p = toWorld(sx, sy);
      let best: GraphNode | null = null;
      let bestDist = Infinity;
      for (const node of nodes) {
        const d = Math.hypot((node.x ?? 0) - p.x, (node.y ?? 0) - p.y);
        if (d < node.radius + 6 / view.k && d < bestDist) {
          best = node;
          bestDist = d;
        }
      }
      return best;
    };

    /** The hovered node and its neighbours, or null when nothing is hovered. */
    const litNodes = () => (hovered ? new Set([hovered.id, ...(neighbours.get(hovered.id) ?? [])]) : null);
    const isLit = (link: (typeof links)[number], lit: Set<string> | null) =>
      !!lit && lit.has(link.source.id) && lit.has(link.target.id) && (link.source === hovered || link.target === hovered);
    const isLabelled = (node: GraphNode, lit: Set<string> | null) => {
      const important = node === hovered || node.id === focus || (lit?.has(node.id) ?? false);
      const showAll = view.k > 1.1 || nodes.length < 40;
      if (!showAll && !important && node.degree < 6) return false;
      return !lit || lit.has(node.id);
    };

    function draw() {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.translate(width / 2 + view.x, height / 2 + view.y);
      context.scale(view.k, view.k);
      const lit = litNodes();

      context.lineWidth = 1 / view.k;
      for (const link of links) {
        const on = isLit(link, lit);
        context.strokeStyle = on ? inks.accent : inks.rule;
        context.globalAlpha = lit && !on ? 0.35 : 1;
        context.lineWidth = (on ? 2 : 1) / view.k;
        context.beginPath();
        context.moveTo(link.source.x!, link.source.y!);
        context.lineTo(link.target.x!, link.target.y!);
        context.stroke();
      }
      context.globalAlpha = 1;

      for (const node of nodes) {
        const dim = lit && !lit.has(node.id);
        context.globalAlpha = dim ? 0.3 : 1;
        context.beginPath();
        context.arc(node.x!, node.y!, node.radius, 0, Math.PI * 2);
        if (node.kind === 'unresolved') {
          context.fillStyle = halftone ?? inks.ink3;
          context.fill();
        } else {
          context.fillStyle = node.kind === 'attachment' ? inks.ink3 : inks.ink;
          context.fill();
        }
        if (node === hovered || node.id === focus) {
          // Pink drum printed slightly out of register over the ink.
          context.globalCompositeOperation = inks.night ? 'screen' : 'multiply';
          context.fillStyle = inks.accent;
          context.beginPath();
          context.arc(node.x! + 1.2, node.y! + 1, node.radius + 1.5, 0, Math.PI * 2);
          context.fill();
          context.globalCompositeOperation = 'source-over';
        }
        if (node.fx !== undefined && node.fx !== null) {
          context.strokeStyle = inks.ink;
          context.lineWidth = 1.2 / view.k;
          context.beginPath();
          context.arc(node.x!, node.y!, node.radius + 3, 0, Math.PI * 2);
          context.stroke();
        }
      }
      context.globalAlpha = 1;

      context.font = `500 ${12 / view.k}px 'Archivo Variable', system-ui, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'top';
      for (const node of nodes) {
        if (!isLabelled(node, lit)) continue;
        const important = node === hovered || node.id === focus || (lit?.has(node.id) ?? false);
        context.fillStyle = important ? inks.ink : inks.ink2;
        context.fillText(node.label, node.x!, node.y! + node.radius + 3 / view.k);
      }
    }

    const savePins = () => {
      const next: Record<string, [number, number]> = { ...pins };
      for (const node of nodes) {
        if (node.fx != null && node.fy != null) next[node.id] = [Math.round(node.fx), Math.round(node.fy)];
        else delete next[node.id];
      }
      void session.platform.storage.set(pinsKey, next);
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const node = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
      moved = false;
      canvas.setPointerCapture(e.pointerId);
      if (node) {
        dragging = node;
        simulation.alphaTarget(0.25).restart();
      } else {
        panning = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (dragging) {
        moved = true;
        userMoved = true;
        const p = toWorld(sx, sy);
        dragging.fx = p.x;
        dragging.fy = p.y;
      } else if (panning) {
        moved = true;
        userMoved = true;
        view = { ...view, x: panning.vx + e.clientX - panning.x, y: panning.vy + e.clientY - panning.y };
        draw();
      } else {
        const node = nodeAt(sx, sy);
        if (node !== hovered) {
          hovered = node;
          canvas.style.cursor = node ? 'pointer' : 'grab';
          draw();
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (dragging) {
        simulation.alphaTarget(0);
        if (!moved) {
          // A click opens the note; dragging pins it where it was dropped. A pinned
          // note waits for a possible second click, which frees it instead.
          const node = dragging;
          const target = e.metaKey || e.ctrlKey ? 'tab' : 'current';
          const open = () => {
            if (node.kind !== 'unresolved') session.openPath(node.id, target);
            else void session.openLink(node.id, '');
          };
          clearTimeout(opening);
          if (node.fx != null) opening = setTimeout(open, DOUBLE_CLICK_MS);
          else open();
        } else savePins();
      }
      dragging = null;
      panning = null;
    };
    const onDoubleClick = (e: MouseEvent) => {
      clearTimeout(opening);
      const rect = canvas.getBoundingClientRect();
      const node = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (!node) return;
      node.fx = null;
      node.fy = null;
      savePins();
      simulation.alpha(0.3).restart();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMoved = true;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left - width / 2;
      const sy = e.clientY - rect.top - height / 2;
      const k = Math.min(5, Math.max(0.15, view.k * Math.exp(-e.deltaY * 0.0015)));
      view = { k, x: sx - ((sx - view.x) * k) / view.k, y: sy - ((sy - view.y) * k) / view.k };
      draw();
    };

    (canvas as HTMLCanvasElement & { graphProbe?: () => GraphProbe }).graphProbe = () => {
      const lit = litNodes();
      return {
        view: { ...view },
        width,
        height,
        moving: simulation.alpha() >= simulation.alphaMin(),
        hovered: hovered?.id ?? null,
        nodes: nodes.map((node) => ({
          id: node.id,
          kind: node.kind,
          degree: node.degree,
          radius: node.radius,
          x: node.x!,
          y: node.y!,
          sx: width / 2 + view.x + node.x! * view.k,
          sy: height / 2 + view.y + node.y! * view.k,
          pinned: node.fx != null,
          dimmed: !!lit && !lit.has(node.id),
          labelled: isLabelled(node, lit),
        })),
        links: links.map((link) => ({ source: link.source.id, target: link.target.id, lit: isLit(link, lit) })),
      };
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('dblclick', onDoubleClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    return () => {
      clearTimeout(opening);
      simulation.stop();
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('dblclick', onDoubleClick);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [data, pins, pinsLoaded, inks, visible, session, pinsKey, focus]);

  const toggle = (key: 'orphans' | 'attachments' | 'unresolved') => setOptions((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="graph-view">
      <div className="graph-tools">
        <input
          type="search"
          value={options.query}
          placeholder={t('graph.search')}
          aria-label={t('graph.search')}
          onChange={(e) => setOptions((o) => ({ ...o, query: e.target.value }))}
        />
        <label className="check">
          <input type="checkbox" checked={options.orphans} onChange={() => toggle('orphans')} />
          {t('graph.orphans')}
        </label>
        <label className="check">
          <input type="checkbox" checked={options.attachments} onChange={() => toggle('attachments')} />
          {t('graph.attachments')}
        </label>
        <label className="check">
          <input type="checkbox" checked={options.unresolved} onChange={() => toggle('unresolved')} />
          {t('graph.unresolved')}
        </label>
        {focus && (
          <label className="check">
            {t('graph.local')}
            <input
              type="range"
              min={1}
              max={3}
              value={options.depth}
              onChange={(e) => setOptions((o) => ({ ...o, depth: Number(e.target.value) }))}
              aria-label={t('graph.local')}
            />
            <span className="count">{options.depth}</span>
          </label>
        )}
        <button
          className="button is-ghost"
          onClick={() => {
            setPins({});
            void session.platform.storage.set(pinsKey, {});
          }}
        >
          <RotateCcw size={14} strokeWidth={1.75} aria-hidden />
          {t('graph.reset')}
        </button>
      </div>
      <canvas ref={canvasRef} className="graph-canvas" role="img" aria-label={`${t('graph.title')}: ${data.nodes.length}`} />
      <p className="graph-hint">{t('graph.pinned')}</p>
    </div>
  );
}
