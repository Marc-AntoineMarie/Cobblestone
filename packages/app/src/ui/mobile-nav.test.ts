import { describe, expect, it } from 'vitest';
import type { VaultFile } from '@cobblestone/core';
import { initialWorkspace, open } from '../workspace/workspace';
import { excerpt, mobileBack, previousView, recentlyChanged, relativeTime, screenKey } from './mobile-nav';

const note = (path: string) => ({ type: 'note' as const, path });

describe('mobile stack', () => {
  it('goes back through the history, then home', () => {
    let s = open(initialWorkspace(), note('A.md'));
    s = open(s, note('B.md'));
    expect(previousView(s)).toEqual(note('A.md'));
    const back = mobileBack(s)!;
    expect(screenKey(back)).toContain('A.md');
    expect(mobileBack(back)).toBeNull();
  });

  it('closes a view opened in a new tab, back to the tab below', () => {
    let s = open(initialWorkspace(), note('A.md'));
    s = open(s, { type: 'settings' }, 'tab');
    expect(previousView(s)).toEqual(note('A.md'));
    const back = mobileBack(s)!;
    expect(screenKey(back)).toContain('A.md');
  });

  it('shows home for an empty tab, and a new key on every navigation', () => {
    expect(screenKey(initialWorkspace())).toBeNull();
    const a = open(initialWorkspace(), note('A.md'));
    const b = open(a, note('B.md'));
    expect(screenKey(a)).not.toBe(screenKey(b));
  });
});

describe('home lists', () => {
  const file = (path: string, mtime: number): VaultFile => {
    const name = path.split('/').pop()!;
    const extension = name.split('.').pop()!;
    return {
      path,
      name,
      basename: name.replace(/\.[^.]+$/, ''),
      extension,
      parent: '',
      stat: { mtime, ctime: 0, size: 0 },
    } as VaultFile;
  };

  it('lists notes and canvases, last changed first', () => {
    const files = [file('a.md', 1), file('b.png', 9), file('c.canvas', 5), file('d.md', 3)];
    expect(recentlyChanged(files).map((f) => f.path)).toEqual(['c.canvas', 'd.md', 'a.md']);
  });

  it('turns the start of a note into plain text', () => {
    const md =
      '---\ntags: [x]\n---\n# Title\n\n> [!info] Box\nSee [[Links and backlinks|the links]] and **bold** [[Other#Part]].\n- [ ] task one\n';
    expect(excerpt(md)).toBe('See the links and bold Other. task one');
    expect(excerpt('word '.repeat(40), 20)).toHaveLength(20);
  });

  it('dates changes the way a list of notes does', () => {
    const now = new Date(2026, 10, 16, 18, 0).getTime();
    expect(relativeTime(new Date(2026, 10, 16, 9, 12).getTime(), now, 'fr-FR', 'hier')).toMatch(/^0?9:12$/);
    expect(relativeTime(new Date(2026, 10, 15, 9, 0).getTime(), now, 'fr-FR', 'hier')).toBe('hier');
    expect(relativeTime(new Date(2026, 8, 29).getTime(), now, 'fr-FR', 'hier')).toBe('29 sept.');
    expect(relativeTime(new Date(2025, 8, 29).getTime(), now, 'fr-FR', 'hier')).toBe('29 sept. 2025');
  });
});
