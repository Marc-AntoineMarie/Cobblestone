import { useEffect, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { ArrowLeft, ArrowRight, Bookmark as BookmarkIcon, BookmarkCheck, MoreHorizontal, Share2 } from 'lucide-react';
import { dirname, stem } from '@cobblestone/core';
import { isBookmarked } from '../bookmarks';
import { t } from '../i18n';
import { navigate, setMode, split, type EditorMode, type Tab, type ViewState } from '../workspace/workspace';
import { Editor } from './Editor';
import { useSession, useStore } from './hooks';
import { ReadingView } from './ReadingView';

type NoteViewState = Extract<ViewState, { type: 'note' }>;

export function NoteView({ tab, paneId, view, visible }: { tab: Tab; paneId: string; view: NoteViewState; visible: boolean }) {
  const session = useSession();
  const defaultMode = useStore(session.settings, (s) => s.defaultMode);
  const readable = useStore(session.settings, (s) => s.readableLength);
  const bookmarked = useStore(session.bookmarks, (b) => isBookmarked(b, view.path));
  const mode: EditorMode = view.mode ?? defaultMode;
  const editorView = useRef<EditorView | null>(null);
  const exists = !!session.vault.getFile(view.path);

  const setTabMode = (next: EditorMode) => session.workspace.setState((s) => setMode(s, paneId, tab.id, next));

  const more = (event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    session.ui.setState({
      menu: {
        x: rect.right - 220,
        y: rect.bottom + 4,
        items: [
          { label: t('note.splitRight'), run: () => session.workspace.setState((s) => split(s, 'row')) },
          { label: t('note.splitDown'), run: () => session.workspace.setState((s) => split(s, 'column')) },
          { label: t('cmd.sourceMode'), run: () => setTabMode(mode === 'source' ? 'live' : 'source') },
          { label: t('cmd.localGraph'), run: () => session.openView({ type: 'graph', focus: view.path }, 'split-right') },
          { label: t('cmd.revealFile'), run: () => session.revealInTree(view.path) },
          ...(session.canRevealInSystem ? [{ label: session.revealLabel, run: () => session.revealInSystem(view.path) }] : []),
          { label: t('cmd.copyLink'), run: () => void session.commands.run('note:copy-link') },
          { label: t('cmd.deleteNote'), run: () => void session.delete(view.path), danger: true, separatorBefore: true },
        ],
      },
    });
  };

  if (!exists) {
    return (
      <div className="note-missing">
        <p>{t('note.missing')}</p>
      </div>
    );
  }

  const folder = dirname(view.path);

  return (
    <article className="note-view" data-mode={mode}>
      <header className="note-bar">
        <div className="note-nav">
          <button
            className="icon-button"
            disabled={tab.back.length === 0}
            onClick={() => session.workspace.setState((s) => navigate(s, 'back'))}
            aria-label={t('note.back')}
            title={t('note.back')}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
          <button
            className="icon-button"
            disabled={tab.forward.length === 0}
            onClick={() => session.workspace.setState((s) => navigate(s, 'forward'))}
            aria-label={t('note.forward')}
            title={t('note.forward')}
          >
            <ArrowRight size={16} strokeWidth={1.75} />
          </button>
        </div>
        <nav className="note-crumbs" aria-label={folder || session.vault.name}>
          {folder &&
            folder.split('/').map((part, i, parts) => (
              <button key={i} className="crumb" onClick={() => session.revealInTree(parts.slice(0, i + 1).join('/'))}>
                {part}
              </button>
            ))}
          <span className="crumb is-current">{stem(view.path)}</span>
        </nav>
        <div className="note-actions">
          <div className="segmented" role="group" aria-label={t('cmd.toggleMode')}>
            <button aria-pressed={mode !== 'read'} onClick={() => setTabMode(mode === 'source' ? 'source' : 'live')}>
              {mode === 'source' ? t('note.modeSource') : t('note.modeEdit')}
            </button>
            <button aria-pressed={mode === 'read'} onClick={() => setTabMode('read')}>
              {t('note.modeRead')}
            </button>
          </div>
          <button
            className="button is-primary share-button"
            onClick={() => session.ui.setState({ share: view.path })}
            aria-label={t('note.share')}
          >
            <Share2 size={15} strokeWidth={1.9} aria-hidden />
            <span className="share-label">{t('note.share')}</span>
          </button>
          <button
            className={`icon-button${bookmarked ? ' is-on' : ''}`}
            onClick={() => session.toggleBookmark(view.path)}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? t('bookmark.remove') : t('bookmark.add')}
            title={bookmarked ? t('bookmark.remove') : t('bookmark.add')}
          >
            {bookmarked ? <BookmarkCheck size={16} strokeWidth={1.75} /> : <BookmarkIcon size={16} strokeWidth={1.75} />}
          </button>
          <button className="icon-button" onClick={more} aria-label={t('note.more')} title={t('note.more')}>
            <MoreHorizontal size={16} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <div className="note-scroll">
        <div className={`page${readable ? ' is-readable' : ''}`}>
          {/* Keyed by path: a fresh field per note, so a new note's title is selected, not the previous one's. */}
          <NoteTitle key={view.path} path={view.path} onEnter={() => editorView.current?.focus()} />
          {mode === 'read' ? (
            <ReadingView path={view.path} subpath={view.subpath} />
          ) : (
            <Editor
              key={`${tab.id}:${tab.nav ?? 0}`}
              path={view.path}
              tabId={tab.id}
              mode={mode === 'source' ? 'source' : 'live'}
              subpath={view.subpath}
              onView={(v) => (editorView.current = v)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

/** The file name, editable in place: renaming the title renames the file and its links. */
function NoteTitle({ path, onEnter }: { path: string; onEnter: () => void }) {
  const session = useSession();
  const name = stem(path);
  const [value, setValue] = useState(name);
  const focusTitle = useStore(session.ui, (s) => s.focusTitle);
  const ref = useRef<HTMLTextAreaElement>(null);
  const cancelled = useRef(false);

  useEffect(() => setValue(name), [name]);

  useEffect(() => {
    if (focusTitle !== path || !ref.current) return;
    ref.current.focus();
    ref.current.select();
    session.ui.setState({ focusTitle: null });
  }, [focusTitle, path, session]);

  // Grow with the text.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const commit = async () => {
    if (cancelled.current) {
      cancelled.current = false;
      setValue(name);
      return;
    }
    const next = value.replace(/\s+/g, ' ').trim();
    if (!next || next === name) {
      setValue(name);
      return;
    }
    const ok = await session.rename(path, next);
    if (!ok) setValue(name);
  };

  return (
    <textarea
      ref={ref}
      className="note-title"
      rows={1}
      value={value}
      spellCheck={false}
      aria-label={t('cmd.renameNote')}
      placeholder={t('note.untitledTitle')}
      onChange={(e) => setValue(e.target.value.replace(/\n/g, ''))}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // Hand the keyboard to the text at once; the rename runs on blur.
          e.preventDefault();
          e.currentTarget.blur();
          onEnter();
        } else if (e.key === 'Escape') {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
    />
  );
}
