import { useEffect, useRef } from 'react';
import { useSession, useStore } from './hooks';
import { usePreferences } from './preferences';
import { renderNoteInto } from './render-note';

/** The note rendered as a page: links follow, tasks toggle in the file, callouts fold. */
export function ReadingView({ path, subpath, visible = true }: { path: string; subpath?: string; visible?: boolean }) {
  const session = useSession();
  const ref = useRef<HTMLDivElement>(null);
  // Drawn again when the line break setting or the paper changes (diagrams follow the paper).
  const lineBreaks = useStore(session.settings, (s) => s.lineBreaks);
  const { paper } = usePreferences();

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    const toggleTask = (line: number) => {
      void session.vault.process(path, (onDisk) => {
        // The shared text, when there is one: the file can be a write behind what the others typed.
        const text = session.sync.sharedText(path) ?? onDisk;
        const lines = text.split('\n');
        const current = lines[line];
        if (current === undefined) return text;
        lines[line] = current.replace(/\[(.)\]/, (_m, status: string) => (status === ' ' ? '[x]' : '[ ]'));
        return lines.join('\n');
      });
    };

    const draw = async () => {
      // Writing together: the shared text shows what the others type as they type it.
      const text = session.sync.sharedText(path) ?? (await session.vault.read(path));
      if (cancelled) return;
      const scroll = container.closest('.note-scroll')?.scrollTop;
      cleanup?.();
      cleanup = renderNoteInto(container, text, { session, sourcePath: path, onToggleTask: toggleTask });
      const scroller = container.closest('.note-scroll');
      if (scroller && scroll !== undefined) scroller.scrollTop = scroll;
    };
    void draw();
    const offModify = session.vault.on('modify', (file) => file.path === path && void draw());
    // What the other devices type, at most a few times a second.
    let live: ReturnType<typeof setTimeout> | undefined;
    const offShared = session.sync.watchText(path, () => {
      if (live) return;
      live = setTimeout(() => {
        live = undefined;
        void draw();
      }, 120);
    });
    // Link targets appearing or disappearing elsewhere change how links look here.
    let redraw: ReturnType<typeof setTimeout> | undefined;
    const offResolved = session.vault.cache.on('resolved', () => {
      clearTimeout(redraw);
      redraw = setTimeout(() => void draw(), 400);
    });
    const offJump = session.events.on('jump', (target, line) => {
      if (target !== path) return;
      const el = [...container.querySelectorAll<HTMLElement>('[data-line]')]
        .filter((node) => Number(node.dataset.line) <= line)
        .pop();
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    return () => {
      cancelled = true;
      clearTimeout(redraw);
      clearTimeout(live);
      offShared();
      cleanup?.();
      offModify();
      offResolved();
      offJump();
    };
  }, [session, path, lineBreaks, paper]);

  // The other devices see this one on the note while it is the one in view.
  useEffect(() => (visible ? session.sync.reading(path) : undefined), [session, path, visible]);

  useEffect(() => {
    if (!subpath || !ref.current) return;
    const range = session.locate(path, subpath);
    if (range) session.events.emit('jump', path, range.from);
  }, [session, path, subpath]);

  return <div className="markdown-rendered reading-view" ref={ref} />;
}
