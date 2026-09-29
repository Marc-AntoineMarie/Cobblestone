import { describe, expect, it } from 'vitest';
import {
  activeTab,
  closeTab,
  findPane,
  initialWorkspace,
  navigate,
  open,
  panes,
  removePaths,
  renamePaths,
  split,
  togglePin,
  type WorkspaceState,
} from './workspace';

const note = (path: string) => ({ type: 'note' as const, path });
const current = (s: WorkspaceState) => activeTab(s)!.view;

describe('workspace', () => {
  it('opens in the current tab with back/forward history', () => {
    let s = initialWorkspace();
    s = open(s, note('A.md'));
    s = open(s, note('B.md'));
    expect(findPane(s)!.tabs).toHaveLength(1);
    expect(current(s)).toEqual(note('B.md'));
    s = navigate(s, 'back');
    expect(current(s)).toEqual(note('A.md'));
    s = navigate(s, 'forward');
    expect(current(s)).toEqual(note('B.md'));
  });

  it('opens new tabs, reuses a tab already showing the file, and respects pinned tabs', () => {
    let s = open(initialWorkspace(), note('A.md'));
    s = open(s, note('B.md'), 'tab');
    expect(findPane(s)!.tabs).toHaveLength(2);
    s = open(s, note('A.md'), 'tab');
    expect(findPane(s)!.tabs).toHaveLength(2);
    expect(current(s)).toEqual(note('A.md'));
    const pane = findPane(s)!;
    s = togglePin(s, pane.id, pane.activeTab);
    s = open(s, note('C.md'));
    expect(findPane(s)!.tabs).toHaveLength(3);
  });

  it('splits and collapses panes when their last tab closes', () => {
    let s = open(initialWorkspace(), note('A.md'));
    s = split(s, 'row', note('B.md'));
    expect(panes(s.layout)).toHaveLength(2);
    expect(current(s)).toEqual(note('B.md'));
    const pane = findPane(s)!;
    s = closeTab(s, pane.id, pane.activeTab);
    expect(s.layout.type).toBe('pane');
    expect(current(s)).toEqual(note('A.md'));
  });

  it('follows renames and closes deleted files', () => {
    let s = open(initialWorkspace(), note('Folder/A.md'));
    s = open(s, note('Other.md'), 'tab');
    s = renamePaths(s, 'Folder', 'Archive/Folder');
    expect(findPane(s)!.tabs.map((t) => t.view)).toEqual([note('Archive/Folder/A.md'), note('Other.md')]);
    s = removePaths(s, 'Other.md');
    expect(findPane(s)!.tabs.map((t) => t.view)).toEqual([note('Archive/Folder/A.md')]);
  });
});
