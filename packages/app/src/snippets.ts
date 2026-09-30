import type { VaultAdapter } from '@cobblestone/core';

/*
 * CSS snippets: stylesheets of the reader's own, applied on top of the theme.
 * Cobblestone's live in ".cobblestone/snippets"; Obsidian's, in
 * ".obsidian/snippets", are read too (never written) so a vault keeps its look.
 */

export const SNIPPETS_FOLDER = '.cobblestone/snippets';
export const OBSIDIAN_SNIPPETS_FOLDER = '.obsidian/snippets';

export interface Snippet {
  /** Vault path of the file: the snippet's identity in the settings. */
  path: string;
  /** File name without ".css". */
  name: string;
  source: 'cobblestone' | 'obsidian';
}

/** The snippets of a vault, Cobblestone's first, each group by name. */
export async function findSnippets(adapter: VaultAdapter): Promise<Snippet[]> {
  const folders = [SNIPPETS_FOLDER, OBSIDIAN_SNIPPETS_FOLDER];
  const present = await Promise.all(folders.map((folder) => adapter.stat(folder)));
  // Listing every file costs a walk of the vault: only when a snippets folder exists.
  if (!present.some((stat) => stat?.type === 'folder')) return [];
  const snippets: Snippet[] = [];
  for (const file of await adapter.list()) {
    if (file.type !== 'file' || !file.path.toLowerCase().endsWith('.css')) continue;
    const slash = file.path.lastIndexOf('/');
    const folder = file.path.slice(0, slash);
    if (!folders.includes(folder)) continue;
    snippets.push({
      path: file.path,
      name: file.path.slice(slash + 1, -4),
      source: folder === SNIPPETS_FOLDER ? 'cobblestone' : 'obsidian',
    });
  }
  return snippets.sort((a, b) => a.source.localeCompare(b.source) || a.name.localeCompare(b.name));
}

/** The snippets Obsidian has turned on in this vault, as vault paths. */
export function obsidianEnabledSnippets(appearance: Record<string, unknown> | null): string[] {
  const names = appearance?.enabledCssSnippets;
  if (!Array.isArray(names)) return [];
  return names
    .filter((n): n is string => typeof n === 'string' && !n.includes('/'))
    .map((n) => `${OBSIDIAN_SNIPPETS_FOLDER}/${n}.css`);
}

/** The id of the style element that carries a snippet. */
export const snippetElementId = (path: string) => `snippet-${path.replace(/[^a-zA-Z0-9]+/g, '-')}`;

/**
 * Puts the enabled snippets in the page, in order, and removes the others.
 * Returns what could not be read, for the caller to report.
 */
export async function applySnippets(adapter: VaultAdapter, enabled: string[], doc: Document = document): Promise<string[]> {
  const failed: string[] = [];
  const texts = await Promise.all(
    enabled.map((path) =>
      adapter.read(path).catch(() => {
        failed.push(path);
        return null;
      }),
    ),
  );
  for (const old of doc.head.querySelectorAll('style[data-snippet]')) old.remove();
  enabled.forEach((path, i) => {
    const text = texts[i];
    if (text == null) return;
    const style = doc.createElement('style');
    style.id = snippetElementId(path);
    style.dataset.snippet = path;
    style.textContent = text;
    doc.head.append(style);
  });
  return failed;
}
