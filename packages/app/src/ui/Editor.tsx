import { useEffect, useRef, useState } from 'react';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basename, stem } from '@cobblestone/core';
import {
  createEditorState,
  modeCompartment,
  modeExtension,
  spellcheckCompartment,
  spellcheckExtension,
  type EditorModeName,
} from '../editor/setup';
import type { EditorHost } from '../editor/host';
import { describeError } from '../errors';
import { t } from '../i18n';
import type { Session } from '../session';
import { hidePreviewSoon, schedulePreview } from './preview';
import { renderNoteInto } from './render-note';
import { useSession, useStore } from './hooks';

interface Props {
  path: string;
  /** Tab showing the editor, so commands can reach the active one. */
  tabId: string;
  mode: EditorModeName;
  /** Heading/block to scroll to when opened. */
  subpath?: string;
  /** Receives the view so the title can hand focus to the text. */
  onView?: (view: EditorView | null) => void;
}

function createHost(session: Session, pathRef: { current: string }): EditorHost {
  const cache = session.vault.cache;
  return {
    sourcePath: () => pathRef.current,
    resolve: (target) => cache.resolve(target, pathRef.current),
    openLink: (target, { newTab }) => void session.openLink(target, pathRef.current, newTab ? 'tab' : 'current'),
    openTag: (tag) => session.findTag(tag),
    previewLink: (target, anchor) => schedulePreview(session, target, pathRef.current, anchor, 150),
    endPreview: () => hidePreviewSoon(session),
    openExternal: (url) => session.platform.openExternal(url),
    resourceUrl: (path) => session.resourceUrl(path),
    renderEmbed: (container, target, _display) => {
      const content = document.createElement('div');
      container.replaceChildren(content);
      // An embed renders like a one-link note: the reading renderer does the rest.
      return renderNoteInto(content, `![[${target}]]`, { session, sourcePath: pathRef.current, ancestors: [pathRef.current] });
    },
    linkCandidates: () =>
      session.vault.getFiles().map((file) => ({
        path: file.path,
        name: file.extension === 'md' ? file.basename : file.name,
        aliases: cache.getMetadata(file.path)?.aliases ?? [],
      })),
    headings: (path) => cache.getMetadata(path)?.headings.map((h) => ({ text: h.text, level: h.level })) ?? [],
    blockIds: (path) => {
      const meta = cache.getMetadata(path);
      const lines = (session.vault.cachedRead(path) ?? '').split('\n');
      return Object.values(meta?.blocks ?? {}).map((b) => ({ id: b.id, text: (lines[b.startLine] ?? '').trim() }));
    },
    tags: () => [...cache.getTags().keys()],
    linkText: (path) => cache.resolver.linkText(path, pathRef.current),
    saveAttachment: (file) => session.saveAttachment(file, pathRef.current),
  };
}

/** Applies an outside change with a minimal edit so the cursor and undo history survive. */
function applyExternal(view: EditorView, text: string) {
  const current = view.state.doc.toString();
  if (current === text) return;
  let start = 0;
  while (start < current.length && start < text.length && current[start] === text[start]) start++;
  let endA = current.length;
  let endB = text.length;
  while (endA > start && endB > start && current[endA - 1] === text[endB - 1]) {
    endA--;
    endB--;
  }
  view.dispatch({ changes: { from: start, to: endA, insert: text.slice(start, endB) }, userEvent: 'external' });
}

export function Editor({ path, tabId, mode, subpath, onView }: Props) {
  const session = useSession();
  const spellcheck = useStore(session.settings, (s) => s.spellcheck);
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const pathRef = useRef(path);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; text: string } | null>(null);
  /** The note could not be read: no editor, so nothing empty can be saved over it. */
  const [failure, setFailure] = useState<string | null>(null);
  pathRef.current = path;

  /** Saves the pending edit now; `leaving`: the page is going away, keep a copy until it is written. */
  const flush = (leaving = false) => {
    const job = pending.current;
    if (!job) return;
    clearTimeout(job.timer);
    pending.current = null;
    session.saveText(pathRef.current, job.text, leaving);
  };

  // Create the editor once per mount; renames only change pathRef.
  useEffect(() => {
    let disposed = false;
    let view: EditorView | null = null;
    let unregister = () => {};
    void session.vault.read(path).then(
      (text) => {
        if (disposed || !host.current) return;
        const state = createEditorState(text, {
          host: createHost(session, pathRef),
          mode,
          spellcheck,
          onChange: (next) => {
            if (pending.current) clearTimeout(pending.current.timer);
            pending.current = { text: next, timer: setTimeout(() => flush(), 350) };
          },
        });
        view = new EditorView({ state, parent: host.current });
        viewRef.current = view;
        unregister = session.registerEditor(tabId, view);
        onView?.(view);
        if (subpath) scrollToSubpath(view, session, pathRef.current, subpath);
      },
      (error: unknown) => !disposed && setFailure(describeError(error)),
    );
    const offModify = session.vault.on('modify', (file, content) => {
      if (file.path !== pathRef.current || !viewRef.current || content === null) return;
      // Ignore echoes of our own pending edit.
      if (pending.current) return;
      applyExternal(viewRef.current, content);
    });
    const offJump = session.events.on('jump', (target, line) => {
      const v = viewRef.current;
      if (target !== pathRef.current || !v) return;
      const pos = v.state.doc.line(Math.min(v.state.doc.lines, line + 1)).from;
      v.dispatch({
        selection: EditorSelection.cursor(pos),
        effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 48 }),
      });
      v.focus();
    });
    return () => {
      disposed = true;
      unregister();
      flush();
      offModify();
      offJump();
      onView?.(null);
      view?.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: modeCompartment.reconfigure(modeExtension(mode)) });
  }, [mode]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: spellcheckCompartment.reconfigure(spellcheckExtension(spellcheck)) });
  }, [spellcheck]);

  useEffect(() => {
    if (subpath && viewRef.current) scrollToSubpath(viewRef.current, session, pathRef.current, subpath);
  }, [subpath, session]);

  // Save before the page goes away.
  useEffect(() => {
    const onHide = () => flush(true);
    window.addEventListener('beforeunload', onHide);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  });

  if (failure) {
    return (
      <p className="editor-failure" role="alert">
        {t('note.readError', { error: failure })}
      </p>
    );
  }
  return <div className="editor-host" ref={host} data-note={stem(basename(path))} />;
}

function scrollToSubpath(view: EditorView, session: Session, path: string, subpath: string) {
  const range = session.locate(path, subpath);
  if (!range) return;
  const pos = view.state.doc.line(Math.min(view.state.doc.lines, range.from + 1)).from;
  view.dispatch({ selection: EditorSelection.cursor(pos), effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 48 }) });
}
