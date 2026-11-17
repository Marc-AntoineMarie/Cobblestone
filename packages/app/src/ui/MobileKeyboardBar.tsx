import { useRef } from 'react';
import { redo, undo } from '@codemirror/commands';
import { Bold, Check, ChevronDown, Hash, Heading, Italic, List, ListChecks, Paperclip, Redo2, Undo2 } from 'lucide-react';
import { cycleHeading, insertText, insertWikiLink, toggleBullet, toggleTask, toggleWrap } from '../editor/commands';
import { t } from '../i18n';
import { useSession } from './hooks';

/**
 * The note's formatting, just above the keyboard while writing on the phone. The buttons keep the
 * focus in the text, so the keyboard stays up.
 */
export function MobileKeyboardBar({ path, onDone }: { path: string; onDone: () => void }) {
  const session = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const insertAt = useRef(0);

  const run = (action: (view: NonNullable<typeof session.activeEditor>) => unknown) => {
    const view = session.activeEditor;
    if (!view) return;
    action(view);
    view.focus();
  };

  const attach = async (files: FileList | null) => {
    const view = session.activeEditor;
    if (!view || !files?.length) return;
    try {
      const texts = await Promise.all([...files].map((file) => session.saveAttachment(file, path)));
      const insert = texts.join('\n');
      const at = Math.min(insertAt.current, view.state.doc.length);
      view.dispatch({ changes: { from: at, insert }, selection: { anchor: at + insert.length }, userEvent: 'input' });
    } catch (error) {
      session.fail(error);
    }
  };

  const buttons: { label: string; icon: React.ReactNode; run: () => void }[] = [
    { label: t('mobile.kb.link'), icon: <span className="mobile-kb-text">[[ ]]</span>, run: () => run(insertWikiLink) },
    { label: t('mobile.kb.tag'), icon: <Hash size={19} strokeWidth={2} />, run: () => run((v) => insertText(v, '#')) },
    { label: t('mobile.kb.task'), icon: <ListChecks size={19} strokeWidth={2} />, run: () => run(toggleTask) },
    { label: t('mobile.kb.heading'), icon: <Heading size={19} strokeWidth={2} />, run: () => run(cycleHeading) },
    { label: t('cmd.bold'), icon: <Bold size={19} strokeWidth={2.2} />, run: () => run((v) => toggleWrap(v, '**')) },
    { label: t('cmd.italic'), icon: <Italic size={19} strokeWidth={2} />, run: () => run((v) => toggleWrap(v, '*')) },
    { label: t('mobile.kb.list'), icon: <List size={19} strokeWidth={2} />, run: () => run(toggleBullet) },
    {
      label: t('mobile.kb.attach'),
      icon: <Paperclip size={19} strokeWidth={2} />,
      run: () => {
        insertAt.current = session.activeEditor?.state.selection.main.head ?? 0;
        fileRef.current?.click();
      },
    },
    { label: t('mobile.kb.undo'), icon: <Undo2 size={19} strokeWidth={2} />, run: () => run(undo) },
    { label: t('mobile.kb.redo'), icon: <Redo2 size={19} strokeWidth={2} />, run: () => run(redo) },
  ];

  return (
    <div className="mobile-kb" role="toolbar" aria-label={t('mobile.kb')}>
      <div className="mobile-kb-scroll">
        {buttons.map((b) => (
          <button
            key={b.label}
            aria-label={b.label}
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.run}
          >
            {b.icon}
          </button>
        ))}
      </div>
      <button
        className="mobile-kb-hide"
        aria-label={t('mobile.kb.hide')}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => session.activeEditor?.contentDOM.blur()}
      >
        <ChevronDown size={20} strokeWidth={2} />
      </button>
      <button className="mobile-kb-done" onPointerDown={(e) => e.preventDefault()} onClick={onDone}>
        <Check size={17} strokeWidth={2.4} aria-hidden />
        {t('mobile.done')}
      </button>
      <input
        ref={fileRef}
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
