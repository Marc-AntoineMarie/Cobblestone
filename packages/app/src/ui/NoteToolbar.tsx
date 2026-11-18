import { useRef, useState } from 'react';
import { Bold, Check, Image, Italic, Link2, List, ListChecks, Redo2, Table, Undo2 } from 'lucide-react';
import { redo, undo } from '@codemirror/commands';
import type { EditorView } from '@codemirror/view';
import {
  headingLevelAt,
  insertTable,
  insertWikiLink,
  setHeadingLevel,
  toggleBullet,
  toggleTask,
  toggleWrap,
} from '../editor/commands';
import { t } from '../i18n';
import type { EditorMode } from '../workspace/workspace';
import { useSession } from './hooks';

const HEADINGS = [0, 1, 2, 3] as const;

/**
 * Over the note while it is being written: the marks of Markdown as buttons, and
 * the choice between the written page and its Markdown source.
 */
export function NoteToolbar({
  path,
  mode,
  onMode,
  editor,
}: {
  path: string;
  mode: EditorMode;
  onMode: (mode: EditorMode) => void;
  editor: () => EditorView | null;
}) {
  const session = useSession();
  const file = useRef<HTMLInputElement>(null);
  const [level, setLevel] = useState(0);

  const run = (action: (view: EditorView) => unknown) => {
    const view = editor();
    if (!view) return;
    action(view);
    setLevel(headingLevelAt(view.state));
    view.focus();
  };

  const attach = async (files: FileList | null) => {
    const view = editor();
    if (!view || !files?.length) return;
    try {
      const texts = await Promise.all([...files].map((f) => session.saveAttachment(f, path)));
      const insert = texts.join('\n');
      const at = view.state.selection.main.head;
      view.dispatch({ changes: { from: at, insert }, selection: { anchor: at + insert.length }, userEvent: 'input' });
      view.focus();
    } catch (error) {
      session.fail(error);
    }
  };

  const button = (label: string, icon: React.ReactNode, action: (view: EditorView) => unknown) => (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => run(action)}
    >
      {icon}
    </button>
  );

  return (
    <div className="note-toolbar" role="toolbar" aria-label={t('toolbar.label')}>
      <label className="toolbar-heading">
        <span className="sr-only">{t('toolbar.style')}</span>
        <select
          value={level}
          aria-label={t('toolbar.style')}
          onMouseDown={() => {
            const view = editor();
            if (view) setLevel(headingLevelAt(view.state));
          }}
          onChange={(e) => run((view) => setHeadingLevel(view, Number(e.target.value)))}
        >
          {HEADINGS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? t('toolbar.text') : t('toolbar.heading', { level: n })}
            </option>
          ))}
        </select>
      </label>

      <span className="toolbar-rule" aria-hidden />
      {button(t('cmd.bold'), <Bold size={16} strokeWidth={2.2} />, (v) => toggleWrap(v, '**'))}
      {button(t('cmd.italic'), <Italic size={16} strokeWidth={2} />, (v) => toggleWrap(v, '*'))}
      {button(t('cmd.highlight'), <span className="toolbar-mark">A</span>, (v) => toggleWrap(v, '=='))}

      <span className="toolbar-rule" aria-hidden />
      {button(t('toolbar.list'), <List size={16} strokeWidth={2} />, toggleBullet)}
      {button(t('toolbar.task'), <ListChecks size={16} strokeWidth={2} />, toggleTask)}

      <span className="toolbar-rule" aria-hidden />
      {button(t('toolbar.link'), <Link2 size={16} strokeWidth={2} />, insertWikiLink)}
      {button(t('toolbar.table'), <Table size={16} strokeWidth={2} />, (v) => insertTable(v))}
      <button
        className="icon-button"
        aria-label={t('toolbar.image')}
        title={t('toolbar.image')}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => file.current?.click()}
      >
        <Image size={16} strokeWidth={2} />
      </button>

      <span className="toolbar-rule" aria-hidden />
      {button(t('mobile.kb.undo'), <Undo2 size={16} strokeWidth={2} />, undo)}
      {button(t('mobile.kb.redo'), <Redo2 size={16} strokeWidth={2} />, redo)}

      <span className="toolbar-space" />
      <div className="segmented is-small" role="group" aria-label={t('toolbar.view')}>
        <button aria-pressed={mode !== 'source'} onClick={() => onMode('live')}>
          {mode !== 'source' && <Check size={13} strokeWidth={2.4} aria-hidden />}
          {t('toolbar.document')}
        </button>
        <button aria-pressed={mode === 'source'} onClick={() => onMode('source')}>
          {mode === 'source' && <Check size={13} strokeWidth={2.4} aria-hidden />}
          {t('toolbar.markdown')}
        </button>
      </div>

      <input
        ref={file}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          void attach(e.currentTarget.files);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}
