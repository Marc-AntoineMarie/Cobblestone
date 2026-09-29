import { Emitter } from './events';
import { LinkResolver, linkKey } from './links/resolver';
import { parseMarkdown } from './markdown/parse';
import type { LinkRef, NoteMetadata } from './markdown/types';
import { isMarkdown } from './path';

export interface Backlink {
  source: string;
  /** Body links from `source` resolving to the file. */
  links: LinkRef[];
  /** Property keys of `source` linking to the file. */
  propertyKeys: string[];
}

type CacheEvents = {
  /** A note was (re)parsed. */
  changed: [path: string, metadata: NoteMetadata];
  deleted: [path: string];
  /** Link resolution changed for these notes (graph, backlinks...). */
  resolved: [sources: string[]];
};

/**
 * Index of every file of the vault: parsed metadata for notes, resolved and
 * unresolved links, backlinks, tags and aliases. Kept up to date
 * incrementally by the Vault.
 */
export class MetadataCache extends Emitter<CacheEvents> {
  readonly resolver = new LinkResolver();
  private metadata = new Map<string, NoteMetadata>();
  /** source -> destination -> number of links */
  private resolved = new Map<string, Map<string, number>>();
  /** source -> unresolved link path -> number of links */
  private unresolved = new Map<string, Map<string, number>>();
  /** destination -> sources linking to it */
  private incoming = new Map<string, Set<string>>();
  /** link key (lowercase name) -> sources having links with that name, to re-resolve on file changes */
  private sourcesByLinkKey = new Map<string, Set<string>>();

  get files(): string[] {
    return [...this.allFiles];
  }
  private allFiles = new Set<string>();

  getMetadata(path: string): NoteMetadata | undefined {
    return this.metadata.get(path);
  }

  /** Registers a file (any type). Notes also need `setContent`. */
  addFile(path: string): void {
    if (this.allFiles.has(path)) return;
    this.allFiles.add(path);
    this.resolver.add(path);
    this.reresolve(this.sourcesAffectedBy(path));
  }

  /** Parses a note and resolves its links. */
  setContent(path: string, text: string): NoteMetadata {
    if (!this.allFiles.has(path)) {
      this.allFiles.add(path);
      this.resolver.add(path);
      this.reresolve(this.sourcesAffectedBy(path));
    }
    const previous = this.metadata.get(path);
    if (previous) this.unindexLinkKeys(path, previous);
    const meta = parseMarkdown(text);
    this.metadata.set(path, meta);
    this.indexLinkKeys(path, meta);
    this.resolveSource(path);
    this.emit('changed', path, meta);
    this.emit('resolved', [path]);
    return meta;
  }

  removeFile(path: string): void {
    if (!this.allFiles.delete(path)) return;
    this.resolver.remove(path);
    const meta = this.metadata.get(path);
    if (meta) this.unindexLinkKeys(path, meta);
    this.metadata.delete(path);
    this.clearSource(path);
    this.emit('deleted', path);
    this.reresolve(this.sourcesAffectedBy(path));
  }

  renameFile(oldPath: string, newPath: string): void {
    const meta = this.metadata.get(oldPath);
    this.allFiles.delete(oldPath);
    this.resolver.remove(oldPath);
    if (meta) this.unindexLinkKeys(oldPath, meta);
    this.metadata.delete(oldPath);
    this.clearSource(oldPath);
    this.emit('deleted', oldPath);

    this.allFiles.add(newPath);
    this.resolver.add(newPath);
    if (meta) {
      this.metadata.set(newPath, meta);
      this.indexLinkKeys(newPath, meta);
      this.resolveSource(newPath);
      this.emit('changed', newPath, meta);
    }
    this.reresolve(new Set([...this.sourcesAffectedBy(oldPath), ...this.sourcesAffectedBy(newPath), newPath]));
  }

  resolve(linkpath: string, sourcePath: string): string | null {
    return this.resolver.resolve(linkpath, sourcePath);
  }

  /** Resolved outgoing links: destination -> count. */
  getResolvedLinks(source: string): ReadonlyMap<string, number> {
    return this.resolved.get(source) ?? new Map();
  }

  /** Unresolved outgoing links: link path -> count. */
  getUnresolvedLinks(source: string): ReadonlyMap<string, number> {
    return this.unresolved.get(source) ?? new Map();
  }

  /** Every resolved link of the vault, source -> destination -> count (graph view). */
  get resolvedLinks(): ReadonlyMap<string, ReadonlyMap<string, number>> {
    return this.resolved;
  }

  get unresolvedLinks(): ReadonlyMap<string, ReadonlyMap<string, number>> {
    return this.unresolved;
  }

  /** Notes linking to `path`, with the matching links. */
  getBacklinks(path: string): Backlink[] {
    const out: Backlink[] = [];
    for (const source of this.incoming.get(path) ?? []) {
      if (source === path) continue;
      const meta = this.metadata.get(source);
      if (!meta) continue;
      const links = meta.links.filter((l) => this.resolve(l.target, source) === path);
      const propertyKeys = meta.frontmatterLinks.filter((l) => this.resolve(l.target, source) === path).map((l) => l.key);
      if (links.length || propertyKeys.length) out.push({ source, links, propertyKeys });
    }
    return out.sort((a, b) => a.source.localeCompare(b.source));
  }

  /** Tag -> number of notes using it. Nested tags also count for their parents ("#a/b" counts for "#a"). */
  getTags(): Map<string, number> {
    const counts = new Map<string, { name: string; count: number }>();
    for (const meta of this.metadata.values()) {
      const perNote = new Set<string>();
      for (const tag of meta.allTags) {
        const parts = tag.slice(1).split('/');
        for (let i = 1; i <= parts.length; i++) perNote.add('#' + parts.slice(0, i).join('/'));
      }
      for (const tag of perNote) {
        const key = tag.toLowerCase();
        const entry = counts.get(key);
        if (entry) entry.count++;
        else counts.set(key, { name: tag, count: 1 });
      }
    }
    return new Map([...counts.values()].map(({ name, count }) => [name, count]));
  }

  /** Notes carrying a tag or one of its nested tags. */
  getNotesWithTag(tag: string): string[] {
    const wanted = (tag.startsWith('#') ? tag : '#' + tag).toLowerCase();
    const out: string[] = [];
    for (const [path, meta] of this.metadata) {
      if (meta.allTags.some((t) => t.toLowerCase() === wanted || t.toLowerCase().startsWith(wanted + '/'))) out.push(path);
    }
    return out.sort();
  }

  /** Alias -> notes declaring it. */
  getAliases(): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const [path, meta] of this.metadata) {
      for (const alias of meta.aliases) {
        const list = out.get(alias);
        if (list) list.push(path);
        else out.set(alias, [path]);
      }
    }
    return out;
  }

  private allLinkTargets(meta: NoteMetadata): string[] {
    return [...meta.links.map((l) => l.target), ...meta.frontmatterLinks.map((l) => l.target)].filter((t) => t !== '');
  }

  private indexLinkKeys(source: string, meta: NoteMetadata) {
    for (const target of this.allLinkTargets(meta)) {
      const key = linkKey(target);
      let set = this.sourcesByLinkKey.get(key);
      if (!set) this.sourcesByLinkKey.set(key, (set = new Set()));
      set.add(source);
    }
  }

  private unindexLinkKeys(source: string, meta: NoteMetadata) {
    for (const target of this.allLinkTargets(meta)) {
      const set = this.sourcesByLinkKey.get(linkKey(target));
      set?.delete(source);
      if (set?.size === 0) this.sourcesByLinkKey.delete(linkKey(target));
    }
  }

  /** Notes whose links might resolve differently once `path` appears or disappears. */
  private sourcesAffectedBy(path: string): Set<string> {
    return new Set(this.sourcesByLinkKey.get(linkKey(path)) ?? []);
  }

  private reresolve(sources: Set<string>) {
    const changed: string[] = [];
    for (const source of sources) {
      if (!this.metadata.has(source)) continue;
      this.resolveSource(source);
      changed.push(source);
    }
    if (changed.length) this.emit('resolved', changed);
  }

  private clearSource(source: string) {
    for (const dest of this.resolved.get(source)?.keys() ?? []) {
      const set = this.incoming.get(dest);
      set?.delete(source);
      if (set?.size === 0) this.incoming.delete(dest);
    }
    this.resolved.delete(source);
    this.unresolved.delete(source);
  }

  private resolveSource(source: string) {
    this.clearSource(source);
    const meta = this.metadata.get(source);
    if (!meta || !isMarkdown(source)) return;
    const resolved = new Map<string, number>();
    const unresolved = new Map<string, number>();
    for (const target of this.allLinkTargets(meta)) {
      const dest = this.resolve(target, source);
      if (dest) resolved.set(dest, (resolved.get(dest) ?? 0) + 1);
      else unresolved.set(target, (unresolved.get(target) ?? 0) + 1);
    }
    this.resolved.set(source, resolved);
    if (unresolved.size) this.unresolved.set(source, unresolved);
    for (const dest of resolved.keys()) {
      let set = this.incoming.get(dest);
      if (!set) this.incoming.set(dest, (set = new Set()));
      set.add(source);
    }
  }
}
