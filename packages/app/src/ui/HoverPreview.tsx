import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { extname, splitSubpath, stem } from '@cobblestone/core';
import { t } from '../i18n';
import { useSession, useStore } from './hooks';
import { hidePreviewNow, hidePreviewSoon, keepPreview } from './preview';
import { renderNoteInto } from './render-note';

const WIDTH = 460;
const MAX_HEIGHT = 360;
const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);

/** A sheet laid over the page showing the note (or section) a link points to. */
export function HoverPreview() {
  const session = useSession();
  const preview = useStore(session.ui, (s) => s.preview);
  const body = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const { target, subpath } = preview ? splitSubpath(preview.linktext) : { target: '', subpath: '' };
  const path = preview ? (target ? session.vault.cache.resolve(target, preview.sourcePath) : preview.sourcePath) : null;

  useEffect(() => {
    const container = body.current;
    if (!preview || !container) return;
    container.replaceChildren();
    if (!path) {
      container.textContent = t('note.embedMissing', { name: target });
      return;
    }
    if (IMAGE.has(extname(path))) {
      const img = document.createElement('img');
      void session.resourceUrl(path).then((url) => (img.src = url));
      container.append(img);
      return;
    }
    if (extname(path) !== 'md') {
      container.textContent = stem(path);
      return;
    }
    let cleanup: (() => void) | null = null;
    let cancelled = false;
    void session.vault.read(path).then((text) => {
      if (cancelled) return;
      let shown = text;
      let lineOffset = 0;
      const range = subpath ? session.locate(path, subpath) : null;
      if (range) {
        shown = text
          .split('\n')
          .slice(range.from, range.to + 1)
          .join('\n');
        lineOffset = range.from;
      }
      cleanup = renderNoteInto(container, shown, { session, sourcePath: path, lineOffset, depth: 1, ancestors: [path] });
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [session, preview, path, subpath, target]);

  // Below the link when there is room, otherwise above; always inside the window. Placed again
  // whenever its size changes: the note arrives after the preview opens.
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!preview || !el) return;
    const place = () => {
      const height = Math.min(el.offsetHeight || MAX_HEIGHT, MAX_HEIGHT + 44);
      const below = preview.rect.bottom + 8;
      const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, preview.rect.top - height - 8);
      const left = Math.max(8, Math.min(preview.rect.left, window.innerWidth - WIDTH - 8));
      setPosition((current) => (current.left === left && current.top === top ? current : { left, top }));
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => observer.disconnect();
  }, [preview]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hidePreviewNow(session);
    const onScroll = () => hidePreviewNow(session);
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onScroll);
    };
  }, [preview, session]);

  if (!preview) return null;

  return (
    <div
      ref={sheet}
      className="hover-preview"
      role="dialog"
      aria-label={path ? stem(path) : target}
      style={{ left: position.left, top: position.top, width: WIDTH }}
      onMouseEnter={keepPreview}
      onMouseLeave={() => hidePreviewSoon(session)}
      onWheel={(e) => e.stopPropagation()}
    >
      <header className="hover-preview-head">
        <span className="hover-preview-title">{path ? stem(path) : target}</span>
        {path && (
          <button
            className="icon-button"
            aria-label={t('preview.open')}
            title={t('preview.open')}
            onClick={(e) => {
              hidePreviewNow(session);
              session.openPath(path, e.metaKey || e.ctrlKey ? 'tab' : 'current', subpath || undefined);
            }}
          >
            <ExternalLink size={15} strokeWidth={1.75} />
          </button>
        )}
      </header>
      <div className="hover-preview-body markdown-rendered" ref={body} />
    </div>
  );
}
