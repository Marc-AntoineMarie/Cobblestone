import { isInside, type VaultAdapter } from '@cobblestone/core';

/**
 * Bookmarks use Obsidian's bookmarks.json structure, so a vault's favourites
 * come across on first open. Headings and blocks are file bookmarks with a subpath.
 */
export type Bookmark =
  | { type: 'file'; path: string; subpath?: string; title?: string; ctime: number }
  | { type: 'folder'; path: string; title?: string; ctime: number }
  | { type: 'search'; query: string; title?: string; ctime: number }
  | { type: 'group'; title: string; items: Bookmark[]; ctime: number };

const OWN = '.cobblestone/bookmarks.json';
const OBSIDIAN = '.obsidian/bookmarks.json';

async function readItems(adapter: VaultAdapter, path: string): Promise<Bookmark[] | null> {
  if ((await adapter.stat(path))?.type !== 'file') return null;
  try {
    const data = JSON.parse(await adapter.read(path)) as { items?: unknown };
    return Array.isArray(data.items) ? sanitize(data.items) : [];
  } catch {
    return null;
  }
}

/** Keeps only well-formed entries: the file may come from another app or a hand edit. */
function sanitize(items: unknown[]): Bookmark[] {
  const out: Bookmark[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const ctime = typeof item.ctime === 'number' ? item.ctime : Date.now();
    const title = typeof item.title === 'string' ? item.title : undefined;
    if ((item.type === 'file' || item.type === 'folder') && typeof item.path === 'string') {
      const subpath = item.type === 'file' && typeof item.subpath === 'string' ? item.subpath : undefined;
      out.push({ type: item.type, path: item.path, ctime, ...(title ? { title } : {}), ...(subpath ? { subpath } : {}) });
    } else if (item.type === 'search' && typeof item.query === 'string') {
      out.push({ type: 'search', query: item.query, ctime, ...(title ? { title } : {}) });
    } else if (item.type === 'group' && Array.isArray(item.items)) {
      out.push({ type: 'group', title: title ?? '', items: sanitize(item.items), ctime });
    }
  }
  return out;
}

/** Our bookmarks, or Obsidian's the first time (its file is never modified). */
export async function loadBookmarks(adapter: VaultAdapter): Promise<{ items: Bookmark[]; imported: boolean }> {
  const own = await readItems(adapter, OWN);
  if (own) return { items: own, imported: false };
  const obsidian = await readItems(adapter, OBSIDIAN);
  return { items: obsidian ?? [], imported: !!obsidian?.length };
}

export async function saveBookmarks(adapter: VaultAdapter, items: Bookmark[]): Promise<void> {
  await adapter.mkdir('.cobblestone');
  await adapter.write(OWN, JSON.stringify({ items }, null, 2));
}

function map(items: Bookmark[], fn: (item: Bookmark) => Bookmark | null): Bookmark[] {
  const out: Bookmark[] = [];
  for (const item of items) {
    const next = fn(item.type === 'group' ? { ...item, items: map(item.items, fn) } : item);
    if (next) out.push(next);
  }
  return out;
}

/** Follows a renamed or moved file or folder. */
export function renameInBookmarks(items: Bookmark[], oldPath: string, newPath: string): Bookmark[] {
  return map(items, (item) =>
    (item.type === 'file' || item.type === 'folder') && isInside(item.path, oldPath)
      ? { ...item, path: newPath + item.path.slice(oldPath.length) }
      : item,
  );
}

/** Drops bookmarks of a deleted file or folder. */
export function removeFromBookmarks(items: Bookmark[], path: string): Bookmark[] {
  return map(items, (item) => ((item.type === 'file' || item.type === 'folder') && isInside(item.path, path) ? null : item));
}

export function isBookmarked(items: Bookmark[], path: string): boolean {
  return items.some((item) =>
    item.type === 'group' ? isBookmarked(item.items, path) : item.type === 'file' && item.path === path && !item.subpath,
  );
}

/** Adds a whole-file bookmark at the end, or removes every whole-file bookmark of that path. */
export function toggleFileBookmark(items: Bookmark[], path: string, kind: 'file' | 'folder' = 'file'): Bookmark[] {
  const matches = (item: Bookmark) => item.type === kind && item.path === path && !('subpath' in item && item.subpath);
  const has = (list: Bookmark[]): boolean => list.some((item) => (item.type === 'group' ? has(item.items) : matches(item)));
  if (has(items)) return map(items, (item) => (matches(item) ? null : item));
  return [...items, { type: kind, path, ctime: Date.now() }];
}

export function removeBookmark(items: Bookmark[], target: Bookmark): Bookmark[] {
  return map(items, (item) => (item === target ? null : item));
}
