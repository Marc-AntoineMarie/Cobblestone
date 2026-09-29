import { memo, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react';
import {
  ChevronRight,
  File,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  LayoutDashboard,
  Music,
  Film,
  FileType,
} from 'lucide-react';
import { dirname, isInside } from '@cobblestone/core';
import { t } from '../i18n';
import type { MenuItem } from '../session';
import { useSession, useStore, useVaultRevision } from './hooks';

interface Row {
  path: string;
  name: string;
  depth: number;
  kind: 'folder' | 'file';
  extension: string;
  /** Notes inside (folders only). */
  count: number;
}

const ROW_HEIGHT = 28;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function fileIcon(extension: string) {
  if (extension === 'md') return FileText;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(extension)) return FileImage;
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(extension)) return Music;
  if (['mp4', 'webm', 'mov', 'ogv', 'mkv'].includes(extension)) return Film;
  if (extension === 'pdf') return FileType;
  if (extension === 'canvas') return LayoutDashboard;
  return File;
}

export function FileTree() {
  const session = useSession();
  const revision = useVaultRevision();
  const expanded = useStore(session.ui, (s) => s.expanded);
  const renaming = useStore(session.ui, (s) => s.renaming);
  const revealed = useStore(session.ui, (s) => s.revealed);
  const activePath = useStore(session.workspace, () => session.activePath);
  const [focused, setFocused] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ top: 0, height: 600 });

  const rows = useMemo(() => {
    void revision;
    const folders = session.vault.getFolders();
    const files = session.vault.getFiles();
    const children = new Map<string, { folders: string[]; files: typeof files }>();
    const bucket = (parent: string) => {
      let entry = children.get(parent);
      if (!entry) children.set(parent, (entry = { folders: [], files: [] }));
      return entry;
    };
    for (const folder of folders) bucket(folder.parent).folders.push(folder.path);
    for (const file of files) bucket(file.parent).files.push(file);
    const noteCount = new Map<string, number>();
    for (const file of files) {
      if (file.extension !== 'md') continue;
      for (let dir = file.parent; dir; dir = dirname(dir)) noteCount.set(dir, (noteCount.get(dir) ?? 0) + 1);
    }

    const out: Row[] = [];
    const walk = (parent: string, depth: number) => {
      const entry = children.get(parent);
      if (!entry) return;
      for (const path of [...entry.folders].sort((a, b) => collator.compare(a, b))) {
        out.push({
          path,
          name: path.slice(path.lastIndexOf('/') + 1),
          depth,
          kind: 'folder',
          extension: '',
          count: noteCount.get(path) ?? 0,
        });
        if (expanded[path]) walk(path, depth + 1);
      }
      for (const file of [...entry.files].sort((a, b) => collator.compare(a.name, b.name))) {
        out.push({
          path: file.path,
          // Notes and canvases show their name alone; other files keep their extension.
          name: file.extension === 'md' || file.extension === 'canvas' ? file.basename : file.name,
          depth,
          kind: 'file',
          extension: file.extension,
          count: 0,
        });
      }
    };
    walk('', 0);
    return out;
  }, [session, revision, expanded]);

  // Scroll a revealed item into view.
  useEffect(() => {
    if (!revealed) return;
    const index = rows.findIndex((r) => r.path === revealed);
    if (index !== -1 && scroller.current) {
      const top = index * ROW_HEIGHT;
      const el = scroller.current;
      if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - ROW_HEIGHT) el.scrollTop = top - el.clientHeight / 3;
      setFocused(revealed);
    }
    const timer = setTimeout(() => session.ui.setState({ revealed: null }), 1600);
    return () => clearTimeout(timer);
  }, [revealed, rows, session]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setViewport({ top: el.scrollTop, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggle = (path: string, open?: boolean) =>
    session.ui.setState((s) => ({ expanded: { ...s.expanded, [path]: open ?? !s.expanded[path] } }));

  const openRow = (row: Row, event?: MouseEvent | KeyboardEvent) => {
    if (row.kind === 'folder') return toggle(row.path);
    const newTab = !!event && (event.metaKey || event.ctrlKey);
    session.openPath(row.path, newTab ? 'tab' : 'current');
  };

  const menuFor = (row: Row): MenuItem[] => {
    const items: MenuItem[] = [];
    if (row.kind === 'folder') {
      items.push(
        { label: t('tree.newNoteHere'), run: () => void session.createNote(row.path) },
        { label: t('tree.newFolderHere'), run: () => void session.createFolder(row.path) },
        { label: t('tree.newCanvasHere'), run: () => void session.createCanvas(row.path) },
      );
    } else {
      items.push(
        { label: t('tree.openInNewTab'), run: () => session.openPath(row.path, 'tab') },
        { label: t('tree.openToRight'), run: () => session.openPath(row.path, 'split-right') },
        { label: t('tree.duplicate'), run: () => void session.duplicate(row.path) },
      );
    }
    const bookmarked = session.bookmarks
      .getState()
      .some((b) => (b.type === 'file' || b.type === 'folder') && b.path === row.path && !('subpath' in b && b.subpath));
    items.push(
      { label: bookmarked ? t('bookmark.remove') : t('bookmark.add'), run: () => session.toggleBookmark(row.path) },
      { label: t('tree.rename'), run: () => session.ui.setState({ renaming: row.path }), separatorBefore: true },
      { label: t('tree.delete'), run: () => void session.delete(row.path), danger: true },
    );
    return items;
  };

  const onContextMenu = (event: MouseEvent, row: Row) => {
    event.preventDefault();
    session.ui.setState({ menu: { x: event.clientX, y: event.clientY, items: menuFor(row) } });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (renaming) return;
    const index = rows.findIndex((r) => r.path === focused);
    const row = rows[index];
    const move = (i: number) => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, i))];
      if (next) setFocused(next.path);
    };
    switch (event.key) {
      case 'ArrowDown':
        move(index + 1);
        break;
      case 'ArrowUp':
        move(index - 1);
        break;
      case 'ArrowRight':
        if (row?.kind === 'folder') {
          if (!expanded[row.path]) toggle(row.path, true);
          else move(index + 1);
        }
        break;
      case 'ArrowLeft':
        if (row?.kind === 'folder' && expanded[row.path]) toggle(row.path, false);
        else if (row) {
          const parent = dirname(row.path);
          if (parent) setFocused(parent);
        }
        break;
      case 'Enter':
        if (row) openRow(row, event);
        break;
      case 'F2':
        if (row) session.ui.setState({ renaming: row.path });
        break;
      case 'Delete':
        if (row) void session.delete(row.path);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  // Keep keyboard focus on the focused row as it scrolls into the window.
  useEffect(() => {
    if (!focused || !scroller.current) return;
    const index = rows.findIndex((r) => r.path === focused);
    if (index === -1) return;
    const el = scroller.current;
    const top = index * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_HEIGHT > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_HEIGHT - el.clientHeight;
    // Move keyboard focus only while the tree has it: revealing a file must not steal it from the editor.
    if (!el.contains(document.activeElement)) return;
    requestAnimationFrame(() => el.querySelector<HTMLElement>(`[data-path="${CSS.escape(focused)}"]`)?.focus());
  }, [focused, rows]);

  const onDragStart = (event: DragEvent, row: Row) => {
    event.dataTransfer.setData('application/x-cobblestone-path', row.path);
    event.dataTransfer.setData('text/plain', `[[${session.vault.cache.resolver.linkText(row.path, '')}]]`);
    event.dataTransfer.effectAllowed = 'copyMove';
  };

  const folderOf = (row: Row | null) => (row ? (row.kind === 'folder' ? row.path : dirname(row.path)) : '');

  const onDragOver = (event: DragEvent, row: Row | null) => {
    if (!event.dataTransfer.types.includes('application/x-cobblestone-path')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget(folderOf(row));
  };

  const onDrop = (event: DragEvent, row: Row | null) => {
    const path = event.dataTransfer.getData('application/x-cobblestone-path');
    setDropTarget(null);
    if (!path) return;
    event.preventDefault();
    const folder = folderOf(row);
    if (folder !== dirname(path) && !isInside(folder, path)) void session.move(path, folder);
  };

  const first = Math.max(0, Math.floor(viewport.top / ROW_HEIGHT) - 10);
  const last = Math.min(rows.length, Math.ceil((viewport.top + viewport.height) / ROW_HEIGHT) + 10);
  const visible = rows.slice(first, last);

  if (rows.length === 0) {
    return (
      <div className="tree-empty">
        <p>{t('rail.emptyVault')}</p>
        <button className="button is-primary" onClick={() => void session.createNote()}>
          {t('rail.newNote')}
        </button>
      </div>
    );
  }

  return (
    <div
      className="tree"
      ref={scroller}
      role="tree"
      aria-label={t('rail.notes')}
      onScroll={(e) => setViewport({ top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight })}
      onKeyDown={onKeyDown}
      onDragOver={(e) => onDragOver(e, null)}
      onDragLeave={() => setDropTarget(null)}
      onDrop={(e) => onDrop(e, null)}
      data-drop-root={dropTarget === '' ? 'true' : undefined}
    >
      <div className="tree-canvas" style={{ height: rows.length * ROW_HEIGHT }}>
        {visible.map((row, i) => (
          <TreeRow
            key={row.path}
            row={row}
            top={(first + i) * ROW_HEIGHT}
            open={!!expanded[row.path]}
            active={row.path === activePath}
            focused={row.path === focused || (focused === null && first + i === 0)}
            revealed={row.path === revealed}
            dropping={row.kind === 'folder' && dropTarget === row.path}
            renaming={renaming === row.path}
            onOpen={openRow}
            onFocus={setFocused}
            onContextMenu={onContextMenu}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}
      </div>
    </div>
  );
}

interface RowProps {
  row: Row;
  top: number;
  open: boolean;
  active: boolean;
  focused: boolean;
  revealed: boolean;
  dropping: boolean;
  renaming: boolean;
  onOpen: (row: Row, event?: MouseEvent | KeyboardEvent) => void;
  onFocus: (path: string) => void;
  onContextMenu: (event: MouseEvent, row: Row) => void;
  onDragStart: (event: DragEvent, row: Row) => void;
  onDragOver: (event: DragEvent, row: Row) => void;
  onDrop: (event: DragEvent, row: Row) => void;
}

const TreeRow = memo(function TreeRow({ row, top, open, active, focused, revealed, dropping, renaming, ...handlers }: RowProps) {
  const Icon = row.kind === 'folder' ? (open ? FolderOpen : Folder) : fileIcon(row.extension);
  return (
    <div
      className={`tree-row${active ? ' is-active' : ''}${revealed ? ' is-revealed' : ''}${dropping ? ' is-drop-target' : ''}`}
      style={{ transform: `translateY(${top}px)`, paddingInlineStart: 10 + row.depth * 16 }}
      role="treeitem"
      aria-expanded={row.kind === 'folder' ? open : undefined}
      aria-selected={active}
      aria-level={row.depth + 1}
      data-path={row.path}
      tabIndex={focused ? 0 : -1}
      draggable={!renaming}
      onClick={(e) => handlers.onOpen(row, e)}
      onFocus={() => handlers.onFocus(row.path)}
      onContextMenu={(e) => handlers.onContextMenu(e, row)}
      onDragStart={(e) => handlers.onDragStart(e, row)}
      onDragOver={(e) => {
        e.stopPropagation();
        handlers.onDragOver(e, row);
      }}
      onDrop={(e) => {
        e.stopPropagation();
        handlers.onDrop(e, row);
      }}
    >
      {Array.from({ length: row.depth }, (_, i) => (
        <span key={i} className="tree-guide" style={{ insetInlineStart: 17 + i * 16 }} aria-hidden />
      ))}
      <span className="tree-chevron" aria-hidden>
        {row.kind === 'folder' && <ChevronRight size={14} strokeWidth={2} className={open ? 'is-open' : undefined} />}
      </span>
      <Icon size={15} strokeWidth={1.75} className="tree-icon" aria-hidden />
      {renaming ? <RenameField path={row.path} initial={row.name} /> : <span className="tree-name">{row.name}</span>}
      {row.kind === 'file' && row.extension !== 'md' && <span className="tree-ext">{row.extension}</span>}
      {row.kind === 'folder' && row.count > 0 && <span className="tree-count">{row.count}</span>}
    </div>
  );
});

function RenameField({ path, initial }: { path: string; initial: string }) {
  const session = useSession();
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = async (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    if (commit && value.trim() && value !== initial) await session.rename(path, value);
    session.ui.setState({ renaming: null });
  };
  return (
    <input
      className="tree-rename"
      autoFocus
      value={value}
      aria-label={t('tree.rename')}
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') void finish(true);
        if (e.key === 'Escape') void finish(false);
      }}
    />
  );
}
