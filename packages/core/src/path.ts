/**
 * Vault paths are always POSIX-style, relative to the vault root, without a
 * leading or trailing slash: "Folder/Sub/Note.md". The root folder is "".
 */

export function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

export function joinPath(...segments: string[]): string {
  return normalizePath(segments.filter(Boolean).join('/'));
}

/** Parent folder of a path ("" for top-level entries). */
export function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

/** File name with extension: "Folder/Note.md" -> "Note.md". */
export function basename(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? path : path.slice(i + 1);
}

/** Lowercase extension without the dot: "Note.MD" -> "md", "Makefile" -> "". */
export function extname(path: string): string {
  const name = basename(path);
  const i = name.lastIndexOf('.');
  return i <= 0 ? '' : name.slice(i + 1).toLowerCase();
}

/** File name without extension: "Folder/Note.md" -> "Note". */
export function stem(path: string): string {
  const name = basename(path);
  const i = name.lastIndexOf('.');
  return i <= 0 ? name : name.slice(0, i);
}

export function isMarkdown(path: string): boolean {
  return extname(path) === 'md';
}

/** True for paths inside a hidden folder or hidden files (".obsidian", ".trash", ".git"...). */
export function isHidden(path: string): boolean {
  return path.split('/').some((part) => part.startsWith('.'));
}

/** True if `path` equals `folder` or is nested inside it. */
export function isInside(path: string, folder: string): boolean {
  if (folder === '') return true;
  return path === folder || path.startsWith(folder + '/');
}

/**
 * Relative path from the folder `fromDir` to `to`, e.g.
 * relativePath("a/b", "a/c/Note.md") -> "../c/Note.md".
 */
export function relativePath(fromDir: string, to: string): string {
  const from = fromDir ? fromDir.split('/') : [];
  const target = to.split('/');
  let common = 0;
  while (common < from.length && common < target.length - 1 && from[common] === target[common]) common++;
  const up = from.length - common;
  return [...Array<string>(up).fill('..'), ...target.slice(common)].join('/');
}

/** Characters Obsidian (and most file systems) refuse in file names. */
export const FORBIDDEN_NAME_CHARS = /[\\/:*?"<>|#^[\]]/;

export function isValidFileName(name: string): boolean {
  return name.trim() !== '' && !FORBIDDEN_NAME_CHARS.test(name) && !name.startsWith('.');
}
