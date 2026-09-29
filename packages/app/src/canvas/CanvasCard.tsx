import { memo, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ExternalLink, FileText, Globe } from 'lucide-react';
import { extname, splitSubpath, stem, type CanvasNode, type CanvasSide } from '@cobblestone/core';
import { t } from '../i18n';
import type { Session } from '../session';
import { renderNoteInto } from '../ui/render-note';
import { colorValue } from './model';

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const SIDES: CanvasSide[] = ['top', 'right', 'bottom', 'left'];

export interface CardHandlers {
  onPointerDown: (event: ReactPointerEvent, node: CanvasNode) => void;
  onResizeStart: (event: ReactPointerEvent, node: CanvasNode) => void;
  onConnectStart: (event: ReactPointerEvent, node: CanvasNode, side: CanvasSide) => void;
  onEdit: (node: CanvasNode) => void;
  onText: (node: CanvasNode, text: string) => void;
  onLabel: (node: CanvasNode, label: string) => void;
  onStopEditing: () => void;
}

interface Props extends CardHandlers {
  node: CanvasNode;
  session: Session;
  canvasPath: string;
  selected: boolean;
  editing: boolean;
}

/** One node of the canvas: a card of text, a note, an image, a link, or a group frame. */
export const CanvasCard = memo(function CanvasCard({ node, session, canvasPath, selected, editing, ...handlers }: Props) {
  const ink = colorValue(node.color);
  const style = {
    transform: `translate(${node.x}px, ${node.y}px)`,
    width: node.width,
    height: node.height,
    ...(ink ? { '--node-ink': ink } : {}),
  } as React.CSSProperties;
  const className = `canvas-node is-${node.type}${selected ? ' is-selected' : ''}${ink ? ' is-colored' : ''}${editing ? ' is-editing' : ''}`;

  if (node.type === 'group') {
    return (
      <div className={className} style={style} data-node-id={node.id} onPointerDown={(e) => handlers.onPointerDown(e, node)}>
        {editing ? (
          <input
            className="canvas-group-label is-input"
            autoFocus
            defaultValue={node.label ?? ''}
            placeholder={t('canvas.groupName')}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => {
              handlers.onLabel(node, e.currentTarget.value);
              handlers.onStopEditing();
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
            }}
          />
        ) : (
          <div className="canvas-group-label" onDoubleClick={() => handlers.onEdit(node)}>
            {node.label || t('canvas.groupName')}
          </div>
        )}
        {node.background && <GroupBackground session={session} path={node.background} />}
        {selected && <ResizeHandle node={node} onResizeStart={handlers.onResizeStart} />}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={style}
      data-node-id={node.id}
      onPointerDown={(e) => handlers.onPointerDown(e, node)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handlers.onEdit(node);
      }}
    >
      {node.type === 'text' &&
        (editing ? (
          <TextEditor node={node} onText={handlers.onText} onDone={handlers.onStopEditing} />
        ) : (
          <MarkdownBody session={session} sourcePath={canvasPath} text={node.text} />
        ))}
      {node.type === 'file' && <FileBody session={session} node={node} />}
      {node.type === 'link' && <LinkBody session={session} url={node.url} />}
      {SIDES.map((side) => (
        <span
          key={side}
          className={`canvas-port is-${side}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            handlers.onConnectStart(e, node, side);
          }}
          aria-hidden
        />
      ))}
      {selected && <ResizeHandle node={node} onResizeStart={handlers.onResizeStart} />}
    </div>
  );
});

function ResizeHandle({ node, onResizeStart }: { node: CanvasNode; onResizeStart: CardHandlers['onResizeStart'] }) {
  return (
    <span
      className="canvas-resize"
      onPointerDown={(e) => {
        e.stopPropagation();
        onResizeStart(e, node);
      }}
      aria-hidden
    />
  );
}

function TextEditor({
  node,
  onText,
  onDone,
}: {
  node: Extract<CanvasNode, { type: 'text' }>;
  onText: CardHandlers['onText'];
  onDone: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  return (
    <textarea
      ref={ref}
      className="canvas-text-editor"
      defaultValue={node.text}
      spellCheck
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onChange={(e) => onText(node, e.currentTarget.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') e.currentTarget.blur();
      }}
    />
  );
}

function MarkdownBody({
  session,
  sourcePath,
  text,
  lineOffset = 0,
}: {
  session: Session;
  sourcePath: string;
  text: string;
  lineOffset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return renderNoteInto(ref.current, text, { session, sourcePath, lineOffset, depth: 1, ancestors: [sourcePath] });
  }, [session, sourcePath, text, lineOffset]);
  return <div className="canvas-body markdown-rendered" ref={ref} />;
}

function FileBody({ session, node }: { session: Session; node: Extract<CanvasNode, { type: 'file' }> }) {
  const path = session.vault.getFile(node.file) ? node.file : session.vault.cache.resolve(node.file, '');
  const [text, setText] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const ext = path ? extname(path) : '';

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    const load = () => {
      if (ext === 'md') {
        void session.vault.read(path).then((full) => {
          if (cancelled) return;
          const range = node.subpath ? session.locate(path, node.subpath) : null;
          setText(
            range
              ? full
                  .split('\n')
                  .slice(range.from, range.to + 1)
                  .join('\n')
              : full,
          );
        });
      } else if (IMAGE.has(ext)) {
        void session.resourceUrl(path).then((u) => !cancelled && setUrl(u));
      }
    };
    load();
    const off = session.vault.on('modify', (file) => file.path === path && load());
    return () => {
      cancelled = true;
      off();
    };
  }, [session, path, ext, node.subpath]);

  const title = path ? stem(path) + (node.subpath ? ` › ${node.subpath.replace(/^#\^?/, '')}` : '') : node.file;
  return (
    <>
      <button
        className="canvas-file-title"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => path && session.openPath(path, e.metaKey || e.ctrlKey ? 'tab' : 'current', node.subpath)}
        title={t('canvas.open')}
      >
        <FileText size={13} strokeWidth={1.75} aria-hidden />
        {title}
      </button>
      {!path ? (
        <p className="canvas-missing">{t('note.embedMissing', { name: splitSubpath(node.file).target })}</p>
      ) : IMAGE.has(ext) ? (
        url && <img className="canvas-image" src={url} alt="" draggable={false} />
      ) : ext === 'md' ? (
        text !== null && <MarkdownBody session={session} sourcePath={path} text={text} />
      ) : (
        <p className="canvas-missing">{stem(path)}</p>
      )}
    </>
  );
}

function LinkBody({ session, url }: { session: Session; url: string }) {
  let host = url;
  try {
    host = new URL(url).hostname;
  } catch {
    // keep the raw text
  }
  return (
    <div className="canvas-link">
      <Globe size={20} strokeWidth={1.5} aria-hidden />
      <strong>{host}</strong>
      <span className="canvas-link-url">{url}</span>
      <button className="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => session.platform.openExternal(url)}>
        <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
        {t('canvas.open')}
      </button>
    </div>
  );
}

function GroupBackground({ session, path }: { session: Session; path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const resolved = session.vault.getFile(path) ? path : session.vault.cache.resolve(path, '');
    if (resolved) void session.resourceUrl(resolved).then(setUrl);
  }, [session, path]);
  return url ? <div className="canvas-group-background" style={{ backgroundImage: `url("${url}")` }} /> : null;
}
