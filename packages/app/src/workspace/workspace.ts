import { createStore } from 'zustand/vanilla';
import { extname, isInside } from '@cobblestone/core';

/** What a tab shows. */
export type ViewState =
  | { type: 'empty' }
  | { type: 'note'; path: string; mode?: EditorMode; subpath?: string }
  | { type: 'file'; path: string }
  | { type: 'canvas'; path: string }
  | { type: 'graph'; focus?: string }
  | { type: 'settings'; section?: string };

export type EditorMode = 'live' | 'source' | 'read';

export interface Tab {
  id: string;
  view: ViewState;
  back: ViewState[];
  forward: ViewState[];
  pinned: boolean;
  /** Increases on every navigation (not on renames): views reload when it changes. */
  nav?: number;
}

export interface Pane {
  id: string;
  tabs: Tab[];
  activeTab: string;
}

export type Layout =
  { type: 'pane'; pane: Pane } | { type: 'split'; id: string; direction: 'row' | 'column'; children: Layout[]; sizes: number[] };

export interface WorkspaceState {
  layout: Layout;
  activePane: string;
}

let counter = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export function viewForPath(path: string): ViewState {
  const ext = extname(path);
  if (ext === 'md') return { type: 'note', path };
  if (ext === 'canvas') return { type: 'canvas', path };
  return { type: 'file', path };
}

export function viewPath(view: ViewState): string | null {
  return view.type === 'note' || view.type === 'file' || view.type === 'canvas' ? view.path : null;
}

function newTab(view: ViewState = { type: 'empty' }): Tab {
  return { id: uid('t'), view, back: [], forward: [], pinned: false, nav: 0 };
}

function newPane(view?: ViewState): Pane {
  const tab = newTab(view);
  return { id: uid('p'), tabs: [tab], activeTab: tab.id };
}

export function initialWorkspace(): WorkspaceState {
  const pane = newPane();
  return { layout: { type: 'pane', pane }, activePane: pane.id };
}

// ------------------------------------------------------------ tree helpers

export function panes(layout: Layout): Pane[] {
  return layout.type === 'pane' ? [layout.pane] : layout.children.flatMap(panes);
}

export function findPane(state: WorkspaceState, id = state.activePane): Pane | undefined {
  return panes(state.layout).find((p) => p.id === id);
}

export function activeTab(state: WorkspaceState): Tab | undefined {
  const pane = findPane(state);
  return pane?.tabs.find((t) => t.id === pane.activeTab);
}

function mapPanes(layout: Layout, fn: (pane: Pane) => Pane): Layout {
  if (layout.type === 'pane') return { type: 'pane', pane: fn(layout.pane) };
  return { ...layout, children: layout.children.map((c) => mapPanes(c, fn)) };
}

function updatePane(state: WorkspaceState, id: string, fn: (pane: Pane) => Pane): WorkspaceState {
  return { ...state, layout: mapPanes(state.layout, (p) => (p.id === id ? fn(p) : p)) };
}

/** Removes a pane; its sibling takes the freed space. */
function removePane(layout: Layout, id: string): Layout | null {
  if (layout.type === 'pane') return layout.pane.id === id ? null : layout;
  const kept: Layout[] = [];
  const sizes: number[] = [];
  layout.children.forEach((child, i) => {
    const next = removePane(child, id);
    if (next) {
      kept.push(next);
      sizes.push(layout.sizes[i] ?? 1);
    }
  });
  if (kept.length === 0) return null;
  if (kept.length === 1) return kept[0]!;
  const total = sizes.reduce((a, b) => a + b, 0);
  return { ...layout, children: kept, sizes: sizes.map((s) => s / total) };
}

// ------------------------------------------------------------ operations

export type OpenTarget = 'current' | 'tab' | 'split-right' | 'split-down';

/** Opens a view: in the active tab (with history), a new tab or a new split. */
export function open(state: WorkspaceState, view: ViewState, target: OpenTarget = 'current'): WorkspaceState {
  // Reuse a tab already showing this file in the active pane.
  const pane = findPane(state);
  if (!pane) return state;
  const path = viewPath(view);
  if (target === 'current' || target === 'tab') {
    const existing = path ? pane.tabs.find((t) => viewPath(t.view) === path) : undefined;
    if (existing && target === 'tab') return updatePane(state, pane.id, (p) => ({ ...p, activeTab: existing.id }));
  }

  if (target === 'split-right' || target === 'split-down') {
    return split(state, target === 'split-right' ? 'row' : 'column', view);
  }

  const current = pane.tabs.find((t) => t.id === pane.activeTab);
  if (target === 'tab' || !current || current.pinned) {
    const tab = newTab(view);
    const index = current ? pane.tabs.indexOf(current) + 1 : pane.tabs.length;
    return updatePane(state, pane.id, (p) => ({
      ...p,
      tabs: [...p.tabs.slice(0, index), tab, ...p.tabs.slice(index)],
      activeTab: tab.id,
    }));
  }
  if (sameView(current.view, view)) return state;
  if (current.view.type === 'note' && view.type === 'note' && current.view.path === view.path) {
    const next: ViewState = { ...view, mode: view.mode ?? current.view.mode };
    return updatePane(state, pane.id, (p) => ({
      ...p,
      tabs: p.tabs.map((t) => (t.id === current.id ? { ...t, view: next } : t)),
    }));
  }
  return updatePane(state, pane.id, (p) => ({
    ...p,
    tabs: p.tabs.map((t) =>
      t.id === current.id
        ? {
            ...t,
            view,
            back: current.view.type === 'empty' ? t.back : [...t.back, t.view].slice(-100),
            forward: [],
            nav: (t.nav ?? 0) + 1,
          }
        : t,
    ),
  }));
}

export function split(state: WorkspaceState, direction: 'row' | 'column', view?: ViewState): WorkspaceState {
  const source = findPane(state);
  if (!source) return state;
  const sourceView = view ?? source.tabs.find((t) => t.id === source.activeTab)?.view ?? { type: 'empty' };
  const created = newPane(sourceView);
  const insert = (layout: Layout): Layout => {
    if (layout.type === 'pane') {
      if (layout.pane.id !== source.id) return layout;
      return { type: 'split', id: uid('s'), direction, children: [layout, { type: 'pane', pane: created }], sizes: [0.5, 0.5] };
    }
    // Add as a sibling when the parent already splits in this direction.
    const index = layout.children.findIndex((c) => c.type === 'pane' && c.pane.id === source.id);
    if (index !== -1 && layout.direction === direction) {
      const children = [...layout.children];
      children.splice(index + 1, 0, { type: 'pane', pane: created });
      return { ...layout, children, sizes: children.map(() => 1 / children.length) };
    }
    return { ...layout, children: layout.children.map(insert) };
  };
  return { layout: insert(state.layout), activePane: created.id };
}

export function closeTab(state: WorkspaceState, paneId: string, tabId: string): WorkspaceState {
  const pane = findPane(state, paneId);
  if (!pane) return state;
  const index = pane.tabs.findIndex((t) => t.id === tabId);
  if (index === -1) return state;
  const tabs = pane.tabs.filter((t) => t.id !== tabId);
  if (tabs.length === 0) {
    const all = panes(state.layout);
    if (all.length > 1) {
      const layout = removePane(state.layout, paneId)!;
      const next = panes(layout);
      return {
        layout,
        activePane: state.activePane === paneId ? next[Math.max(0, all.indexOf(pane) - 1)]!.id : state.activePane,
      };
    }
    const tab = newTab();
    return updatePane(state, paneId, (p) => ({ ...p, tabs: [tab], activeTab: tab.id }));
  }
  const activeTab = pane.activeTab === tabId ? tabs[Math.min(index, tabs.length - 1)]!.id : pane.activeTab;
  return updatePane(state, paneId, (p) => ({ ...p, tabs, activeTab }));
}

export function activate(state: WorkspaceState, paneId: string, tabId?: string): WorkspaceState {
  const next = { ...state, activePane: paneId };
  return tabId ? updatePane(next, paneId, (p) => ({ ...p, activeTab: tabId })) : next;
}

export function moveTab(state: WorkspaceState, paneId: string, tabId: string, toIndex: number): WorkspaceState {
  return updatePane(state, paneId, (p) => {
    const tab = p.tabs.find((t) => t.id === tabId);
    if (!tab) return p;
    const tabs = p.tabs.filter((t) => t.id !== tabId);
    tabs.splice(Math.max(0, Math.min(toIndex, tabs.length)), 0, tab);
    return { ...p, tabs };
  });
}

export function togglePin(state: WorkspaceState, paneId: string, tabId: string): WorkspaceState {
  return updatePane(state, paneId, (p) => ({
    ...p,
    tabs: p.tabs.map((t) => (t.id === tabId ? { ...t, pinned: !t.pinned } : t)),
  }));
}

export function navigate(state: WorkspaceState, direction: 'back' | 'forward'): WorkspaceState {
  const pane = findPane(state);
  const tab = pane?.tabs.find((t) => t.id === pane.activeTab);
  if (!pane || !tab) return state;
  const from = direction === 'back' ? tab.back : tab.forward;
  if (from.length === 0) return state;
  const view = from[from.length - 1]!;
  const rest = from.slice(0, -1);
  const nav = (tab.nav ?? 0) + 1;
  const updated: Tab =
    direction === 'back'
      ? { ...tab, view, back: rest, forward: [...tab.forward, tab.view], nav }
      : { ...tab, view, forward: rest, back: [...tab.back, tab.view], nav };
  return updatePane(state, pane.id, (p) => ({ ...p, tabs: p.tabs.map((t) => (t.id === tab.id ? updated : t)) }));
}

export function setMode(state: WorkspaceState, paneId: string, tabId: string, mode: EditorMode): WorkspaceState {
  return updatePane(state, paneId, (p) => ({
    ...p,
    tabs: p.tabs.map((t) => (t.id === tabId && t.view.type === 'note' ? { ...t, view: { ...t.view, mode } } : t)),
  }));
}

export function resizeSplit(state: WorkspaceState, splitId: string, sizes: number[]): WorkspaceState {
  const walk = (layout: Layout): Layout => {
    if (layout.type === 'pane') return layout;
    if (layout.id === splitId) return { ...layout, sizes };
    return { ...layout, children: layout.children.map(walk) };
  };
  return { ...state, layout: walk(state.layout) };
}

/** Keeps tabs pointing at files after a rename or move (folders included). */
export function renamePaths(state: WorkspaceState, oldPath: string, newPath: string): WorkspaceState {
  const fix = (view: ViewState): ViewState => {
    const path = viewPath(view);
    if (!path || !isInside(path, oldPath)) return view;
    return { ...view, path: newPath + path.slice(oldPath.length) } as ViewState;
  };
  return {
    ...state,
    layout: mapPanes(state.layout, (p) => ({
      ...p,
      tabs: p.tabs.map((t) => ({ ...t, view: fix(t.view), back: t.back.map(fix), forward: t.forward.map(fix) })),
    })),
  };
}

/** Closes tabs showing deleted files and drops them from histories. */
export function removePaths(state: WorkspaceState, deleted: string): WorkspaceState {
  const gone = (view: ViewState) => {
    const path = viewPath(view);
    return path !== null && isInside(path, deleted);
  };
  let next: WorkspaceState = {
    ...state,
    layout: mapPanes(state.layout, (p) => ({
      ...p,
      tabs: p.tabs.map((t) => ({ ...t, back: t.back.filter((v) => !gone(v)), forward: t.forward.filter((v) => !gone(v)) })),
    })),
  };
  for (const pane of panes(next.layout)) {
    for (const tab of pane.tabs) if (gone(tab.view)) next = closeTab(next, pane.id, tab.id);
  }
  return next;
}

/** Paths open in any tab, most recent first in the active pane. */
export function openPaths(state: WorkspaceState): string[] {
  return panes(state.layout).flatMap((p) => p.tabs.map((t) => viewPath(t.view)).filter((x): x is string => x !== null));
}

function sameView(a: ViewState, b: ViewState): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'note' && b.type === 'note' && (a.subpath ?? '') !== (b.subpath ?? '')) return false;
  return viewPath(a) === viewPath(b) && (a.type !== 'graph' || a.focus === (b as { focus?: string }).focus);
}

export function createWorkspaceStore(initial: WorkspaceState = initialWorkspace()) {
  return createStore<WorkspaceState>(() => initial);
}
