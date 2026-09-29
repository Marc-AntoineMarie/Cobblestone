import { describe, expect, it } from 'vitest';
import { MemoryAdapter } from '@cobblestone/core';
import {
  isBookmarked,
  loadBookmarks,
  removeFromBookmarks,
  renameInBookmarks,
  saveBookmarks,
  toggleFileBookmark,
  type Bookmark,
} from './bookmarks';

const obsidianFile = JSON.stringify({
  items: [
    { type: 'file', ctime: 1, path: 'Home.md' },
    { type: 'group', ctime: 2, title: 'Work', items: [{ type: 'file', ctime: 3, path: 'Projects/Plan.md', subpath: '#Goals' }] },
    { type: 'search', ctime: 4, query: 'tag:#todo' },
    { type: 'folder', ctime: 5, path: 'Projects' },
    { type: 'unknown-plugin-thing', ctime: 6 },
  ],
});

describe('bookmarks', () => {
  it('imports Obsidian bookmarks once and keeps its file untouched', async () => {
    const adapter = new MemoryAdapter('v', { '.obsidian/bookmarks.json': obsidianFile });
    const { items, imported } = await loadBookmarks(adapter);
    expect(imported).toBe(true);
    expect(items.map((i) => i.type)).toEqual(['file', 'group', 'search', 'folder']);
    await saveBookmarks(adapter, items.slice(0, 1));
    expect((await loadBookmarks(adapter)).items).toHaveLength(1);
    expect(await adapter.read('.obsidian/bookmarks.json')).toBe(obsidianFile);
  });

  it('follows renames and deletions, inside groups too', async () => {
    const { items } = await loadBookmarks(new MemoryAdapter('v', { '.obsidian/bookmarks.json': obsidianFile }));
    const renamed = renameInBookmarks(items, 'Projects', 'Archive/Projects');
    const group = renamed[1] as Extract<Bookmark, { type: 'group' }>;
    expect(group.items[0]).toMatchObject({ path: 'Archive/Projects/Plan.md', subpath: '#Goals' });
    expect(renamed[3]).toMatchObject({ path: 'Archive/Projects' });
    const removed = removeFromBookmarks(renamed, 'Archive/Projects');
    expect((removed[1] as Extract<Bookmark, { type: 'group' }>).items).toEqual([]);
    expect(removed.map((i) => i.type)).toEqual(['file', 'group', 'search']);
  });

  it('toggles whole-file bookmarks', () => {
    let items: Bookmark[] = [];
    items = toggleFileBookmark(items, 'A.md');
    expect(isBookmarked(items, 'A.md')).toBe(true);
    items = toggleFileBookmark(items, 'A.md');
    expect(items).toEqual([]);
  });
});
