import { CalendarDays, FilePlus2, Search } from 'lucide-react';
import { hotkeyLabel } from '../commands';
import { t } from '../i18n';
import { useSession } from './hooks';

/** An empty tab: three ways forward, with their shortcuts. */
export function EmptyView() {
  const session = useSession();
  const actions = [
    { icon: FilePlus2, label: t('empty.newNote'), command: 'note:new' },
    { icon: Search, label: t('empty.find'), command: 'finder:notes' },
    { icon: CalendarDays, label: t('empty.today'), command: 'note:today' },
  ];
  return (
    <div className="empty-view">
      <div className="empty-halftone" aria-hidden />
      <ul className="empty-actions">
        {actions.map(({ icon: Icon, label, command }) => {
          // Shortcuts come from the commands, so the web shows its browser-safe variants.
          const hotkey = session.commands.get(command)?.hotkeys?.[0];
          return (
            <li key={label}>
              <button onClick={() => void session.commands.run(command)}>
                <Icon size={18} strokeWidth={1.75} aria-hidden />
                <span>{label}</span>
                {hotkey && <kbd>{hotkeyLabel(hotkey)}</kbd>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
