import { basename, dirname, extname, isMarkdown, joinPath, normalizePath, relativePath } from '../path';

export type LinkFormat = 'shortest' | 'relative' | 'absolute';

/**
 * Resolves link paths to vault files with Obsidian's rules:
 * 1. exact path from the vault root ("Folder/Note")
 * 2. relative to the linking note's folder ("./Note", "../Other/Note", "Sub/Note")
 * 3. any file whose path ends with the link path; ties prefer the linking
 *    note's folder, then the shortest path, then alphabetical order.
 * Matching ignores case, and ".md" may be omitted.
 */
export class LinkResolver {
  private byPath = new Map<string, string>();
  private byName = new Map<string, string[]>();

  constructor(paths: Iterable<string> = []) {
    for (const path of paths) this.add(path);
  }

  add(path: string): void {
    const lower = path.toLowerCase();
    if (this.byPath.has(lower)) return;
    this.byPath.set(lower, path);
    const name = basename(lower);
    const list = this.byName.get(name);
    if (list) list.push(path);
    else this.byName.set(name, [path]);
  }

  remove(path: string): void {
    const lower = path.toLowerCase();
    if (!this.byPath.delete(lower)) return;
    const name = basename(lower);
    const list = this.byName.get(name)?.filter((p) => p !== path);
    if (list?.length) this.byName.set(name, list);
    else this.byName.delete(name);
  }

  has(path: string): boolean {
    return this.byPath.has(path.toLowerCase());
  }

  /** Files sharing a name (case-insensitive), e.g. every "Index.md". */
  filesNamed(name: string): readonly string[] {
    return this.byName.get(name.toLowerCase()) ?? [];
  }

  resolve(linkpath: string, sourcePath: string): string | null {
    if (linkpath === '') return sourcePath;
    const cleaned = linkpath.replace(/\\/g, '/').trim();
    if (cleaned === '') return sourcePath;
    const candidates = cleaned.toLowerCase().endsWith('.md') ? [cleaned] : [cleaned + '.md', cleaned];
    const sourceDir = dirname(sourcePath);
    const explicitRelative = /^\.\.?\//.test(cleaned);

    for (const candidate of candidates) {
      if (explicitRelative) {
        const hit = this.byPath.get(joinPath(sourceDir, candidate).toLowerCase());
        if (hit) return hit;
        continue;
      }
      const absolute = this.byPath.get(normalizePath(candidate).toLowerCase());
      if (absolute) return absolute;
    }
    if (explicitRelative) return null;

    for (const candidate of candidates) {
      const relative = this.byPath.get(joinPath(sourceDir, candidate).toLowerCase());
      if (relative) return relative;
    }

    for (const candidate of candidates) {
      const wanted = normalizePath(candidate).toLowerCase();
      const matches = this.filesNamed(basename(wanted)).filter((p) => {
        const lower = p.toLowerCase();
        return lower === wanted || lower.endsWith('/' + wanted);
      });
      if (matches.length) return pickBest(matches, sourceDir);
    }
    return null;
  }

  /**
   * Text to write in a link from `sourcePath` to `targetPath`.
   * Markdown notes lose their ".md" unless `keepExtension` is set
   * (markdown-style links keep it).
   */
  linkText(targetPath: string, sourcePath: string, format: LinkFormat = 'shortest', keepExtension = false): string {
    const strip = (p: string) => (!keepExtension && isMarkdown(p) ? p.slice(0, -3) : p);
    if (format === 'absolute') return strip(targetPath);
    if (format === 'relative') {
      const rel = relativePath(dirname(sourcePath), targetPath);
      return strip(rel.startsWith('.') ? rel : './' + rel);
    }
    // Like Obsidian's "shortest path when possible": the bare name only when it is unique in the vault.
    const name = basename(targetPath);
    return strip(this.filesNamed(name).length <= 1 ? name : targetPath);
  }
}

function pickBest(matches: string[], sourceDir: string): string {
  return [...matches].sort((a, b) => {
    const aLocal = dirname(a) === sourceDir ? 0 : 1;
    const bLocal = dirname(b) === sourceDir ? 0 : 1;
    if (aLocal !== bLocal) return aLocal - bLocal;
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  })[0]!;
}

/** Name used to find links that may point to a file: "folder/Note.md" -> "note". */
export function linkKey(path: string): string {
  const name = basename(path).toLowerCase();
  return extname(name) === 'md' ? name.slice(0, -3) : name;
}
