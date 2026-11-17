import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Folder, LayoutDashboard, Search } from 'lucide-react';
import { basename, dirname, stem, type VaultFile } from '@cobblestone/core';
import type { Bookmark } from '../bookmarks';
import { getLanguage, t } from '../i18n';
import type { ListTab } from '../layout';
import { FileTree } from './FileTree';
import { useSession, useStore, useVaultRevision } from './hooks';
import { useLongPress } from './mobile-hooks';
import { fileMenu, folderMenu } from './mobile-menus';
import { excerpt, recentlyChanged, relativeTime } from './mobile-nav';

/**
 * The notes of the vault, the same on a phone and in the workbench's list: the
 * ones changed lately with their first words, the folders one level at a time,
 * or the tags. A long press (or a right click) opens a row's menu.
 */
export function NoteListBody({
  tab,
  onTab,
  folder,
  onFolder,
  onSearch,
  folders = 'levels',
}: {
  tab: ListTab;
  onTab: (tab: ListTab) => void;
  folder: string;
  onFolder: (folder: string) => void;
  onSearch: () => void;
  /** How the folders show: one level at a time (a phone) or the whole tree. */
  folders?: 'levels' | 'tree';
}) {
  return (
    <>
      <div className="list-segments" role="tablist" aria-label={t('list.label')}>
        {(['recent', 'folders', 'tags'] as const).map((id) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => onTab(id)}>
            {t(`list.${id}`)}
          </button>
        ))}
      </div>
      {tab === 'recent' && <RecentList />}
      {tab === 'folders' && (folders === 'tree' ? <FileTree /> : <FolderList folder={folder} onFolder={onFolder} />)}
      {tab === 'tags' && <TagChips onSearch={onSearch} />}
    </>
  );
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

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
      <h2 className="list-label">{t('list.pinned')}</h2>
      <div className="list-pins">
        <button className="list-pin is-today" onClick={() => void session.openDailyNote()}>
          <CalendarDays size={18} strokeWidth={2} aria-hidden />
          <b>{t('rail.today')}</b>
          <small>{today}</small>
        </button>
        {pins.map((b, i) => (
          <PinCard key={i} pin={b} />
        ))}
      </div>
      <h2 className="list-label">{t('list.changed')}</h2>
      {recent.length === 0 ? (
        <p className="list-empty">{t('rail.emptyVault')}</p>
      ) : (
        <ul className="list-rows">
          {recent.map((file) => (
            <NoteRow key={file.path} file={file} time={relativeTime(file.stat.mtime, now, getLanguage(), t('list.yesterday'))} />
          ))}
        </ul>
      )}
    </>
  );
}

/** A pinned note, folder or search; its menu unpins it. */
function PinCard({ pin }: { pin: Exclude<Bookmark, { type: 'group' }> }) {
  const session = useSession();
  const press = useLongPress(({ x, y }) =>
    session.ui.setState({
      menu: {
        x,
        y,
        items: [{ label: t('list.unpin'), run: () => session.unpin(pin) }],
      },
    }),
  );
  const name = pin.title || (pin.type === 'search' ? pin.query : stem(basename(pin.path)));
  return (
    <button className="list-pin" onClick={() => session.openBookmark(pin)} {...press}>
      {pin.type === 'folder' && <Folder size={18} strokeWidth={2} aria-hidden />}
      {pin.type === 'search' && <Search size={18} strokeWidth={2} aria-hidden />}
      <b>{name}</b>
      <small>
        {pin.type === 'search'
          ? t('list.pinSearch')
          : pin.type === 'folder'
            ? t('list.pinFolder')
            : dirname(pin.path) || session.vault.name}
      </small>
    </button>
  );
}

function NoteRow({ file, time, showFolder = true }: { file: VaultFile; time?: string; showFolder?: boolean }) {
  const session = useSession();
  const text = file.extension === 'md' ? excerpt(session.vault.cachedRead(file.path) ?? '') : '';
  const press = useLongPress(({ x, y }) => session.ui.setState({ menu: { x, y, items: fileMenu(session, file.path) } }));
  const current = useStore(session.workspace, () => session.activePath);
  const label = file.extension === 'md' || file.extension === 'canvas' ? file.basename : file.name;
  return (
    <li>
      <button
        className="list-row"
        aria-current={current === file.path ? 'page' : undefined}
        onClick={(event) => session.openPath(file.path, event.metaKey || event.ctrlKey ? 'tab' : 'current')}
        {...press}
      >
        <span className="list-row-title">
          {file.extension === 'canvas' && <LayoutDashboard size={15} strokeWidth={2} aria-hidden />}
          {label}
        </span>
        {time && <time>{time}</time>}
        {(text || (showFolder && file.parent)) && (
          <span className="list-row-detail">
            {showFolder && file.parent && <span className="list-row-folder">{file.parent}</span>}
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
        <button className="list-folder-up" onClick={() => onFolder(dirname(here))}>
          <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
          <span>{dirname(here) ? basename(dirname(here)) : session.vault.name}</span>
          <b>{basename(here)}</b>
        </button>
      )}
      <ul className="list-rows">
        {children.folders.map((f) => (
          <FolderRow key={f.path} path={f.path} name={f.name} count={count(f.path)} onOpen={() => onFolder(f.path)} />
        ))}
        {children.files.map((file) => (
          <NoteRow key={file.path} file={file} showFolder={false} />
        ))}
      </ul>
      {children.folders.length + children.files.length === 0 && <p className="list-empty">{t('list.emptyFolder')}</p>}
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
          className="list-rename"
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
      <button className="list-row is-folder" onClick={onOpen} {...press}>
        <span className="list-row-title">
          <Folder size={18} strokeWidth={1.9} aria-hidden />
          {name}
        </span>
        <span className="list-row-count">
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
  if (tags.length === 0) return <p className="list-empty">{t('list.noTags')}</p>;
  return (
    <div className="list-tags">
      {tags.map(([tag, count]) => (
        <button
          key={tag}
          className="list-tag"
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
