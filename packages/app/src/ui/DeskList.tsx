import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronsUpDown, Network, PanelLeftClose, Plus, Search, Settings, X } from 'lucide-react';
import { t } from '../i18n';
import { PANEL_WIDTHS, type ListTab, type PanelWidth } from '../layout';
import { useSession, useStore } from './hooks';
import { Mark } from './Mark';
import { newNoteMenu } from './MobileHome';
import { NoteListBody } from './NoteList';
import { FindResults } from './SearchPanel';
import { SyncStatus } from './SyncStatus';

/**
 * The list of notes, down the left of the workbench: the vault and one field
 * that finds, creates or asks, then the notes themselves, then what one makes
 * and where the vault stands.
 */
export function DeskList({ width, onSwitchVault }: { width: PanelWidth; onSwitchVault: () => void }) {
  const session = useSession();
  const [tab, setTab] = useState<ListTab>('recent');
  const [folder, setFolder] = useState('');
  const reveal = useStore(session.ui, (s) => s.reveal);
  const revealSeq = reveal?.seq;
  const query = useStore(session.ui, (s) => s.searchQuery);
  const setQuery = (searchQuery: string) => session.ui.setState({ searchQuery });
  const field = useRef<HTMLInputElement>(null);

  // "Show in its folder", a folder bookmark or a tag: the list goes there.
  useEffect(() => {
    if (!reveal) return;
    if (reveal.panel === 'files') {
      const target = session.ui.getState().revealed;
      if (target != null) setFolder(session.vault.getFolder(target) ? target : target.replace(/\/?[^/]*$/, ''));
      setTab('folders');
    } else if (reveal.panel === 'tags') setTab('tags');
    else if (reveal.panel === 'bookmarks') setTab('recent');
    else if (reveal.panel === 'search') requestAnimationFrame(() => field.current?.focus());
    // Only a new request moves the list, not a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealSeq]);

  const vaultMenu = (event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    session.ui.setState({
      menu: {
        x: rect.left,
        y: rect.bottom + 4,
        items: [
          { label: t('rail.settings'), run: () => session.openSettings() },
          ...(session.canRevealInSystem ? [{ label: t('rail.openVaultFolder'), run: () => session.revealInSystem('') }] : []),
          { label: t('rail.switchVault'), run: onSwitchVault },
        ],
      },
    });
  };

  const newMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    session.ui.setState({
      menu: { x: rect.left, y: rect.bottom + 4, items: newNoteMenu(session, tab === 'folders' ? folder : undefined) },
    });
  };

  const style = { '--list-width': `${PANEL_WIDTHS[width]}px` } as CSSProperties;
  return (
    <nav className="desk-list" style={style} aria-label={t('list.label')}>
      <header className="desk-list-top">
        <button className="vault-switch" onClick={vaultMenu} aria-haspopup="menu">
          <Mark size={20} />
          <span className="vault-name">{session.vault.name}</span>
          <ChevronsUpDown size={13} strokeWidth={1.9} aria-hidden />
        </button>
        <button
          className="icon-button"
          aria-label={t('list.hide')}
          title={t('list.hide')}
          onClick={() => void session.commands.run('view:toggle-list')}
        >
          <PanelLeftClose size={17} strokeWidth={1.75} />
        </button>
      </header>

      <div className="search-field">
        <Search size={15} strokeWidth={1.75} aria-hidden className="search-field-icon" />
        <input
          ref={field}
          type="search"
          value={query}
          placeholder={t('list.search')}
          aria-label={t('rail.find')}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;
            setQuery('');
            e.currentTarget.blur();
          }}
        />
        {query && (
          <button className="icon-button search-field-clear" onClick={() => setQuery('')} aria-label={t('launcher.cancel')}>
            <X size={14} strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="desk-list-scroll">
        {query.trim() ? (
          <FindResults query={query} onDone={() => setQuery('')} inputRef={field} />
        ) : (
          <NoteListBody
            tab={tab}
            onTab={setTab}
            folder={folder}
            onFolder={setFolder}
            onSearch={() => field.current?.focus()}
            folders="tree"
          />
        )}
      </div>

      <footer className="desk-list-foot">
        <div className="desk-list-actions">
          <button
            className="button is-primary list-new"
            onClick={() => void session.createNote(tab === 'folders' ? folder : undefined)}
            onContextMenu={newMenu}
          >
            <Plus size={17} strokeWidth={2.2} aria-hidden />
            {t('rail.newNote')}
          </button>
          <button
            className="icon-button"
            aria-label={t('rail.graph')}
            title={t('rail.graph')}
            onClick={() => session.openView({ type: 'graph' }, 'tab')}
          >
            <Network size={17} strokeWidth={1.75} />
          </button>
          <button
            className="icon-button"
            aria-label={t('rail.settings')}
            title={t('rail.settings')}
            onClick={() => session.openSettings()}
          >
            <Settings size={17} strokeWidth={1.75} />
          </button>
        </div>
        <SyncStatus />
      </footer>
    </nav>
  );
}
