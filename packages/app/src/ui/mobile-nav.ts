import type { VaultFile } from '@cobblestone/core';
import {
  closeTab,
  findPane,
  initialWorkspace,
  navigate,
  type Tab,
  type ViewState,
  type WorkspaceState,
} from '../workspace/workspace';

/*
 * The phone shows one screen at a time, as a stack: home, then a note, then the note it links to.
 * The stack is the active tab's history; a view opened in a new tab sits on top of the tab below.
 */

/** What the back gesture leads to: an earlier view, or null for the home screen. */
export function mobileBack(state: WorkspaceState): WorkspaceState | null {
  const pane = findPane(state);
  const tab = pane?.tabs.find((t) => t.id === pane.activeTab);
  if (!pane || !tab) return null;
  if (tab.back.length > 0) return navigate(state, 'back');
  if (pane.tabs.length > 1) return closeTab(state, pane.id, tab.id);
  return null;
}

/** The workspace behind the home screen: one empty tab, no history, so the next note starts a new stack. */
export function homeWorkspace(): WorkspaceState {
  return initialWorkspace();
}

/** The view shown on the phone, or null when there is none (home). */
export function shownTab(state: WorkspaceState): { tab: Tab; paneId: string } | null {
  const pane = findPane(state);
  const tab = pane?.tabs.find((t) => t.id === pane.activeTab);
  if (!pane || !tab || tab.view.type === 'empty') return null;
  return { tab, paneId: pane.id };
}

/** Changes whenever the phone should show a different screen. */
export function screenKey(state: WorkspaceState): string | null {
  const shown = shownTab(state);
  if (!shown) return null;
  const { tab } = shown;
  const v = tab.view;
  const what = 'path' in v ? v.path : v.type;
  return `${tab.id}:${tab.nav ?? 0}:${what}`;
}

/** The view under the current one, to name the back button. */
export function previousView(state: WorkspaceState): ViewState | null {
  const pane = findPane(state);
  const tab = pane?.tabs.find((t) => t.id === pane.activeTab);
  if (!pane || !tab) return null;
  if (tab.back.length > 0) return tab.back[tab.back.length - 1]!;
  const index = pane.tabs.indexOf(tab);
  const below = pane.tabs[index - 1] ?? pane.tabs[index + 1];
  return pane.tabs.length > 1 && below && below.view.type !== 'empty' ? below.view : null;
}

/** Notes and canvases, last changed first. */
export function recentlyChanged(files: VaultFile[], limit = 40): VaultFile[] {
  return files
    .filter((f) => f.extension === 'md' || f.extension === 'canvas')
    .sort((a, b) => b.stat.mtime - a.stat.mtime)
    .slice(0, limit);
}

/** The first words of a note, as plain text: no properties, heading marks, link brackets or emphasis. */
export function excerpt(markdown: string, max = 90): string {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n?/, '');
  const text = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^(#{1,6}\s|>\s*\[!|```|---|\|)/.test(line))
    .map((line) => line.replace(/^>\s?/, ''))
    .join(' ')
    .replace(/!?\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_, target: string, alias?: string) => alias ?? target)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[-*+]\s+(\[.\]\s+)?|^\d+\.\s+/g, '')
    .replace(/\s[-*+]\s+(\[.\]\s+)?/g, ' ')
    .replace(/[*_~=`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

/** "9:12" today, "yesterday", a weekday within a week, then a short date. */
export function relativeTime(mtime: number, now: number, locale: string, yesterday: string): string {
  const date = new Date(mtime);
  const today = new Date(now);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return yesterday;
  if (days < 7) return date.toLocaleDateString(locale, { weekday: 'short' });
  if (date.getFullYear() === today.getFullYear()) return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
