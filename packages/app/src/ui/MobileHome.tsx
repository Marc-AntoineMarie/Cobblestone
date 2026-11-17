import { ChevronDown, Network, Plus, Search, Settings } from 'lucide-react';
import { t } from '../i18n';
import type { ListTab } from '../layout';
import { useSession } from './hooks';
import { useLongPress } from './mobile-hooks';
import { NoteListBody } from './NoteList';

export type HomeTab = ListTab;

/** The phone's home: the list of notes, with the search and the new note under the thumb. */
export function MobileHome({
  hidden,
  tab,
  onTab,
  folder,
  onFolder,
  onSearch,
  onSwitchVault,
}: {
  hidden: boolean;
  tab: ListTab;
  onTab: (tab: ListTab) => void;
  folder: string;
  onFolder: (folder: string) => void;
  onSearch: () => void;
  onSwitchVault: () => void;
}) {
  const session = useSession();
  const newMenu = useLongPress(({ x, y }) =>
    session.ui.setState({
      menu: { x, y, items: newNoteMenu(session, tab === 'folders' ? folder : undefined) },
    }),
  );

  return (
    <div className="mobile-home" hidden={hidden}>
      <div className="mobile-home-scroll">
        <header className="mobile-home-top">
          <button className="mobile-vault" onClick={onSwitchVault} aria-label={t('rail.switchVault')}>
            {session.vault.name}
            <ChevronDown size={15} strokeWidth={2.4} aria-hidden />
          </button>
          <div className="mobile-topbar-actions">
            <button className="mobile-icon" onClick={() => session.openView({ type: 'graph' })} aria-label={t('rail.graph')}>
              <Network size={21} strokeWidth={1.9} />
            </button>
            <button className="mobile-icon" onClick={() => session.openSettings()} aria-label={t('rail.settings')}>
              <Settings size={21} strokeWidth={1.9} />
            </button>
          </div>
        </header>
        <h1 className="mobile-home-title">{t('list.label')}</h1>
        <NoteListBody tab={tab} onTab={onTab} folder={folder} onFolder={onFolder} onSearch={onSearch} />
      </div>

      <div className="mobile-dock">
        <button className="mobile-search-pill" onClick={onSearch}>
          <Search size={19} strokeWidth={2.1} aria-hidden />
          {t('rail.findPlaceholder')}
        </button>
        <button
          className="mobile-new"
          aria-label={t('rail.newNote')}
          onClick={() => void session.createNote(tab === 'folders' ? folder : undefined)}
          {...newMenu}
        >
          <Plus size={24} strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** What a long press (or a right click) on the new note button offers. */
export function newNoteMenu(session: ReturnType<typeof useSession>, folder?: string) {
  return [
    { label: t('rail.newNote'), run: () => void session.createNote(folder) },
    { label: t('cmd.today'), run: () => void session.openDailyNote() },
    { label: t('tree.newCanvasHere'), run: () => void session.createCanvas(folder) },
    { label: t('rail.newFolder'), run: () => void session.createFolder(folder ?? '') },
  ];
}
