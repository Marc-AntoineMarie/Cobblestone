import { createContext, useContext, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  LayoutDashboard,
  Network,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import { basename, dirname, stem, type VaultFile } from '@cobblestone/core';
import type { Bookmark } from '../bookmarks';
import { getLanguage, t } from '../i18n';
import { useSession, useStore, useVaultRevision } from './hooks';
import { useLongPress } from './mobile-hooks';
import { fileMenu, folderMenu } from './mobile-menus';
import { excerpt, recentlyChanged, relativeTime } from './mobile-nav';

export type HomeTab = 'recent' | 'folders' | 'tags';

/** The note shown beside the list, on a tablet. */
const CurrentNote = createContext<string | null>(null);

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** The phone's home: pinned notes, then the notes changed lately; folders and tags one tap away. */
export function MobileHome({
  hidden,
  current,
  tab,
  onTab,
  folder,
  onFolder,
  onSearch,
  onSwitchVault,
}: {
  hidden: boolean;
  /** The note shown beside the list (tablet), marked in it. */
  current: string | null;
  tab: HomeTab;
  onTab: (tab: HomeTab) => void;
  folder: string;
  onFolder: (folder: string) => void;
  onSearch: () => void;
  onSwitchVault: () => void;
}) {
  const session = useSession();
  const newMenu = useLongPress(({ x, y }) =>
    session.ui.setState({
      menu: {
        x,
        y,
        items: [
          { label: t('rail.newNote'), run: () => void session.createNote(tab === 'folders' ? folder : undefined) },
          { label: t('cmd.today'), run: () => void session.openDailyNote() },
          { label: t('tree.newCanvasHere'), run: () => void session.createCanvas(tab === 'folders' ? folder : undefined) },
          { label: t('rail.newFolder'), run: () => void session.createFolder(tab === 'folders' ? folder : '') },
        ],
      },
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
        <h1 className="mobile-home-title">{t('mobile.home')}</h1>
        <div className="mobile-segments" role="tablist" aria-label={t('mobile.home')}>
          {(['recent', 'folders', 'tags'] as const).map((id) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => onTab(id)}>
              {t(`mobile.home.${id}`)}
            </button>
          ))}
        </div>
        <CurrentNote.Provider value={current}>
          {tab === 'recent' && <RecentList />}
          {tab === 'folders' && <FolderList folder={folder} onFolder={onFolder} />}
        </CurrentNote.Provider>
        {tab === 'tags' && <TagChips onSearch={onSearch} />}
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

function flatten(items: Bookmark[]): Bookmark[] {
  return items.flatMap((b) => (b.type === 'group' ? flatten(b.items) : [b]));
}

function RecentList() {
  const session = useSession();
  const revision = useVaultRevision();
  const bookmarks = useStore(session.bookmarks, (b) => b);
  const recent = useMemo(() => {
    void revision;
    return recentlyChanged(session.vault.getFiles());
  }, [session, revision]);
  const pins = flatten(bookmarks).filter(
    (b): b is Exclude<Bookmark, { type: 'group' }> =>
      b.type !== 'group' && (b.type !== 'file' || !!session.vault.getFile(b.path)),
  );
  const now = Date.now();
  const today = new Date().toLocaleDateString(getLanguage(), { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <h2 className="mobile-label">{t('mobile.home.pinned')}</h2>
      <div className="mobile-pins">
        <button className="mobile-pin is-today" onClick={() => void session.openDailyNote()}>
          <CalendarDays size={18} strokeWidth={2} aria-hidden />
          <b>{t('rail.today')}</b>
          <small>{today}</small>
        </button>
        {pins.map((b, i) => (
          <button key={i} className="mobile-pin" onClick={() => session.openBookmark(b)}>
            {b.type === 'folder' && <Folder size={18} strokeWidth={2} aria-hidden />}
            {b.type === 'search' && <Search size={18} strokeWidth={2} aria-hidden />}
            <b>{b.title || (b.type === 'search' ? b.query : stem(basename(b.path)))}</b>
            <small>
              {b.type === 'search'
                ? t('mobile.pinSearch')
                : b.type === 'folder'
                  ? t('mobile.pinFolder')
                  : dirname(b.path) || session.vault.name}
            </small>
          </button>
        ))}
      </div>
      <h2 className="mobile-label">{t('mobile.home.changed')}</h2>
      {recent.length === 0 ? (
        <p className="mobile-empty">{t('rail.emptyVault')}</p>
      ) : (
        <ul className="mobile-list">
          {recent.map((file) => (
            <NoteRow
              key={file.path}
              file={file}
              time={relativeTime(file.stat.mtime, now, getLanguage(), t('mobile.yesterday'))}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function NoteRow({ file, time, showFolder = true }: { file: VaultFile; time?: string; showFolder?: boolean }) {
  const session = useSession();
  const text = file.extension === 'md' ? excerpt(session.vault.cachedRead(file.path) ?? '') : '';
  const press = useLongPress(({ x, y }) => session.ui.setState({ menu: { x, y, items: fileMenu(session, file.path) } }));
  const current = useContext(CurrentNote);
  const label = file.extension === 'md' || file.extension === 'canvas' ? file.basename : file.name;
  return (
    <li>
      <button
        className="mobile-row"
        aria-current={current === file.path ? 'page' : undefined}
        onClick={() => session.openPath(file.path)}
        {...press}
      >
        <span className="mobile-row-title">
          {file.extension === 'canvas' && <LayoutDashboard size={15} strokeWidth={2} aria-hidden />}
          {label}
        </span>
        {time && <time>{time}</time>}
        {(text || (showFolder && file.parent)) && (
          <span className="mobile-row-detail">
            {showFolder && file.parent && <span className="mobile-row-folder">{file.parent}</span>}
            {showFolder && file.parent && text && ' · '}
            {text}
          </span>
        )}
      </button>
    </li>
  );
}

function FolderList({ folder, onFolder }: { folder: string; onFolder: (folder: string) => void }) {
  const session = useSession();
  const revision = useVaultRevision();
  const exists = folder === '' || !!session.vault.getFolder(folder);
  const here = exists ? folder : '';
  const children = useMemo(() => {
    void revision;
    const { folders, files } = session.vault.getChildren(here);
    return {
      folders: folders.filter((f) => !f.name.startsWith('.')).sort((a, b) => collator.compare(a.name, b.name)),
      files: files.sort((a, b) => collator.compare(a.name, b.name)),
    };
  }, [session, here, revision]);
  const count = (path: string) => {
    const c = session.vault.getChildren(path);
    return c.files.length + c.folders.length;
  };

  return (
    <>
      {here && (
        <button className="mobile-folder-up" onClick={() => onFolder(dirname(here))}>
          <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
          <span>{dirname(here) ? basename(dirname(here)) : session.vault.name}</span>
          <b>{basename(here)}</b>
        </button>
      )}
      <ul className="mobile-list">
        {children.folders.map((f) => (
          <FolderRow key={f.path} path={f.path} name={f.name} count={count(f.path)} onOpen={() => onFolder(f.path)} />
        ))}
        {children.files.map((file) => (
          <NoteRow key={file.path} file={file} showFolder={false} />
        ))}
      </ul>
      {children.folders.length + children.files.length === 0 && <p className="mobile-empty">{t('mobile.emptyFolder')}</p>}
    </>
  );
}

function FolderRow({ path, name, count, onOpen }: { path: string; name: string; count: number; onOpen: () => void }) {
  const session = useSession();
  const renaming = useStore(session.ui, (s) => s.renaming === path);
  const press = useLongPress(({ x, y }) => session.ui.setState({ menu: { x, y, items: folderMenu(session, path) } }));
  const [value, setValue] = useState(name);
  if (renaming) {
    const done = (save: boolean) => {
      session.ui.setState({ renaming: null });
      if (save && value.trim() && value !== name) void session.rename(path, value);
    };
    return (
      <li>
        <input
          className="mobile-rename"
          autoFocus
          value={value}
          aria-label={t('tree.rename')}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => done(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            else if (e.key === 'Escape') done(false);
          }}
        />
      </li>
    );
  }
  return (
    <li>
      <button className="mobile-row is-folder" onClick={onOpen} {...press}>
        <span className="mobile-row-title">
          <Folder size={18} strokeWidth={1.9} aria-hidden />
          {name}
        </span>
        <span className="mobile-row-count">
          {count}
          <ChevronRight size={16} strokeWidth={2} aria-hidden />
        </span>
      </button>
    </li>
  );
}

function TagChips({ onSearch }: { onSearch: () => void }) {
  const session = useSession();
  const revision = useVaultRevision();
  const tags = useMemo(() => {
    void revision;
    return [...session.vault.cache.getTags()].sort(([a], [b]) => collator.compare(a, b));
  }, [session, revision]);
  if (tags.length === 0) return <p className="mobile-empty">{t('mobile.noTags')}</p>;
  return (
    <div className="mobile-tags">
      {tags.map(([tag, count]) => (
        <button
          key={tag}
          className="mobile-tag"
          onClick={() => {
            session.ui.setState({ searchQuery: `tag:${tag}` });
            onSearch();
          }}
        >
          {tag}
          <span>{count}</span>
        </button>
      ))}
    </div>
  );
}
