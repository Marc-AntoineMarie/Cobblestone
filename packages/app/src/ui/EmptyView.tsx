import { CalendarDays, FilePlus2, Search } from 'lucide-react';
import { hotkeyLabel, parseHotkey } from '../commands';
import { t } from '../i18n';
import { useSession } from './hooks';

/** An empty tab: three ways forward, with their shortcuts. */
export function EmptyView() {
  const session = useSession();
  const actions = [
    { icon: FilePlus2, label: t('empty.newNote'), hotkey: 'Mod+N', run: () => void session.createNote() },
    { icon: Search, label: t('empty.find'), hotkey: 'Mod+K', run: () => session.ui.setState({ finder: { mode: 'notes' } }) },
    { icon: CalendarDays, label: t('empty.today'), hotkey: 'Mod+Shift+D', run: () => void session.openDailyNote() },
  ];
  return (
    <div className="empty-view">
      <div className="empty-halftone" aria-hidden />
      <ul className="empty-actions">
        {actions.map(({ icon: Icon, label, hotkey, run }) => (
          <li key={label}>
            <button onClick={run}>
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              <span>{label}</span>
              <kbd>{hotkeyLabel(parseHotkey(hotkey))}</kbd>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
