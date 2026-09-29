import type { AdapterChange, FileStat, VaultAdapter } from './adapter';
import { Emitter } from './events';
import { applyEdits, retargetLink, type TextEdit } from './links/rewrite';
import type { LinkRef } from './markdown/types';
import { MetadataCache } from './metadata-cache';
import { basename, dirname, extname, isHidden, isInside, isMarkdown, joinPath, normalizePath, stem } from './path';

export interface VaultFile {
  path: string;
  name: string;
  /** Name without extension. */
  basename: string;
  extension: string;
  parent: string;
  stat: FileStat;
}

export interface VaultFolder {
  path: string;
  name: string;
  parent: string;
}

type VaultEvents = {
  create: [file: VaultFile];
  modify: [file: VaultFile, content: string | null];
  delete: [path: string, kind: 'file' | 'folder'];
  rename: [path: string, oldPath: string, kind: 'file' | 'folder'];
  /** Emitted once the initial scan and indexing are done. */
  ready: [];
};

export interface VaultOptions {
  /** Where deleted files go: a ".trash" folder in the vault (Obsidian-compatible) or permanent removal. */
  trash?: 'vault' | 'permanent';
  /** Rewrite links in other notes when a file is renamed or moved. Default true. */
  updateLinksOnRename?: boolean;
  /** Max text size cached in memory per note. */
  maxCachedChars?: number;
}

export const CONFIG_DIR = '.cobblestone';
export const TRASH_DIR = '.trash';

/**
 * A vault: a folder of notes and attachments. Wraps a storage adapter,
 * keeps the metadata index current and implements the file operations
 * (with link updates on rename). Hidden folders (".cobblestone",
 * ".obsidian", ".trash", ".git"...) are not part of the vault's content.
 */
export class Vault extends Emitter<VaultEvents> {
  readonly cache = new MetadataCache();
  private files = new Map<string, VaultFile>();
  private folders = new Map<string, VaultFolder>();
  private contents = new Map<string, string>();
  private stopWatching: (() => void) | null = null;
  /** Mutations and external changes run one at a time, in order. */
  private queue: Promise<unknown> = Promise.resolve();
  private options: Required<VaultOptions>;
  isReady = false;

  constructor(
    readonly adapter: VaultAdapter,
    options: VaultOptions = {},
  ) {
    super();
    this.options = { trash: 'vault', updateLinksOnRename: true, maxCachedChars: 2_000_000, ...options };
  }

  get name(): string {
    return this.adapter.name;
  }

  async load(): Promise<void> {
    const entries = (await this.adapter.list()).filter((e) => !isHidden(e.path));
    for (const entry of entries) {
      if (entry.type === 'folder') this.folders.set(entry.path, toFolder(entry.path));
      else this.files.set(entry.path, toFile(entry));
    }
    for (const file of this.files.values()) this.cache.addFile(file.path);
    const notes = [...this.files.values()].filter((f) => isMarkdown(f.path));
    // Read notes in parallel batches: fast on disk, gentle on browser storage.
    for (let i = 0; i < notes.length; i += 64) {
      const batch = notes.slice(i, i + 64);
      const texts = await Promise.all(batch.map((f) => this.adapter.read(f.path).catch(() => '')));
      batch.forEach((file, k) => {
        this.remember(file.path, texts[k]!);
        this.cache.setContent(file.path, texts[k]!);
      });
    }
    if (this.adapter.watch) {
      this.stopWatching = this.adapter.watch((change) => {
        this.op(() => this.onExternalChange(change)).catch(() => {});
      });
    }
    this.isReady = true;
    this.emit('ready');
  }

  close(): void {
    this.stopWatching?.();
    this.stopWatching = null;
  }

  // ---------------------------------------------------------------- queries

  getFile(path: string): VaultFile | undefined {
    return this.files.get(normalizePath(path));
  }

  getFolder(path: string): VaultFolder | undefined {
    return this.folders.get(normalizePath(path));
  }

  getFiles(): VaultFile[] {
    return [...this.files.values()];
  }

  getMarkdownFiles(): VaultFile[] {
    return this.getFiles().filter((f) => f.extension === 'md');
  }

  getFolders(): VaultFolder[] {
    return [...this.folders.values()];
  }

  /** Direct children of a folder ("" is the root). */
  getChildren(folder: string): { folders: VaultFolder[]; files: VaultFile[] } {
    return {
      folders: this.getFolders().filter((f) => f.parent === folder),
      files: this.getFiles().filter((f) => f.parent === folder),
    };
  }

  exists(path: string): boolean {
    path = normalizePath(path);
    return this.files.has(path) || this.folders.has(path);
  }

  async read(path: string): Promise<string> {
    path = normalizePath(path);
    const cached = this.contents.get(path);
    if (cached !== undefined) return cached;
    const text = await this.adapter.read(path);
    this.remember(path, text);
    return text;
  }

  /** Cached text of a note, if loaded. */
  cachedRead(path: string): string | undefined {
    return this.contents.get(normalizePath(path));
  }

  readBinary(path: string): Promise<Uint8Array> {
    return this.adapter.readBinary(normalizePath(path));
  }

  // ------------------------------------------------------------- operations

  create(path: string, content = ''): Promise<VaultFile> {
    return this.op(() => this.doCreate(normalizePath(path), content));
  }

  private async doCreate(path: string, content: string): Promise<VaultFile> {
    if (this.exists(path)) throw new Error(`"${path}" already exists`);
    await this.ensureFolder(dirname(path));
    await this.adapter.write(path, content);
    return this.registerFile(path, content);
  }

  createBinary(path: string, data: Uint8Array): Promise<VaultFile> {
    return this.op(() => this.doCreateBinary(normalizePath(path), data));
  }

  private async doCreateBinary(path: string, data: Uint8Array): Promise<VaultFile> {
    if (this.exists(path)) throw new Error(`"${path}" already exists`);
    await this.ensureFolder(dirname(path));
    await this.adapter.writeBinary(path, data);
    return this.registerFile(path, null, data.byteLength);
  }

  modify(path: string, content: string): Promise<void> {
    return this.op(() => this.doModify(normalizePath(path), content));
  }

  private async doModify(path: string, content: string): Promise<void> {
    const file = this.files.get(path);
    if (!file) throw new Error(`"${path}" does not exist`);
    if (this.contents.get(path) === content) return;
    this.remember(path, content);
    await this.adapter.write(path, content);
    file.stat = { ...file.stat, mtime: Date.now(), size: content.length };
    if (isMarkdown(path)) this.cache.setContent(path, content);
    this.emit('modify', file, content);
  }

  /** Reads, transforms and writes a note in one step. */
  process(path: string, fn: (text: string) => string): Promise<string> {
    path = normalizePath(path);
    return this.op(async () => {
      const next = fn(await this.read(path));
      await this.doModify(path, next);
      return next;
    });
  }

  createFolder(path: string): Promise<VaultFolder> {
    path = normalizePath(path);
    return this.op(async () => {
      if (this.files.has(path)) throw new Error(`A file named "${path}" already exists`);
      await this.ensureFolder(path);
      return this.folders.get(path)!;
    });
  }

  /** Moves to the vault trash (".trash", like Obsidian) or deletes permanently. */
  delete(path: string, permanent = this.options.trash === 'permanent'): Promise<void> {
    return this.op(() => this.doDelete(normalizePath(path), permanent));
  }

  private async doDelete(path: string, permanent: boolean): Promise<void> {
    const kind = this.files.has(path) ? 'file' : this.folders.has(path) ? 'folder' : null;
    if (!kind) return;
    if (permanent) await this.adapter.remove(path);
    else await this.adapter.rename(path, await this.freeTrashPath(path));
    this.forget(path, kind);
  }

  /**
   * Renames or moves a file or folder. Links pointing to the moved files are
   * rewritten in every note, and relative links inside moved notes are fixed.
   */
  rename(from: string, to: string): Promise<void> {
    return this.op(() => this.doRename(normalizePath(from), normalizePath(to)));
  }

  private async doRename(from: string, to: string): Promise<void> {
    if (from === to) return;
    const kind = this.files.has(from) ? 'file' : this.folders.has(from) ? 'folder' : null;
    if (!kind) throw new Error(`"${from}" does not exist`);
    const caseOnly = from.toLowerCase() === to.toLowerCase();
    if (this.exists(to) && !caseOnly) throw new Error(`"${to}" already exists`);
    if (kind === 'folder' && isInside(to, from)) throw new Error('Cannot move a folder into itself');

    const moved =
      kind === 'file'
        ? [from]
        : this.getFiles()
            .map((f) => f.path)
            .filter((p) => isInside(p, from));
    const mapping = new Map(moved.map((p) => [p, to + p.slice(from.length)]));

    // Snapshot links to the moved files before the index changes.
    const edits = this.options.updateLinksOnRename ? this.collectLinkEdits(mapping) : null;

    await this.ensureFolder(dirname(to));
    if (caseOnly) {
      // Case-insensitive file systems need a detour for "note" -> "Note".
      const tmp = `${from}.${Date.now()}.tmp`;
      await this.adapter.rename(from, tmp);
      await this.adapter.rename(tmp, to);
    } else {
      await this.adapter.rename(from, to);
    }

    if (kind === 'folder') {
      for (const folder of [...this.folders.keys()].filter((p) => isInside(p, from))) {
        this.folders.delete(folder);
        const next = to + folder.slice(from.length);
        this.folders.set(next, toFolder(next));
      }
    }
    for (const [oldPath, newPath] of mapping) {
      const file = this.files.get(oldPath)!;
      this.files.delete(oldPath);
      const next = toFile({ ...file.stat, path: newPath });
      this.files.set(newPath, next);
      const text = this.contents.get(oldPath);
      this.contents.delete(oldPath);
      if (text !== undefined) this.contents.set(newPath, text);
      this.cache.renameFile(oldPath, newPath);
    }
    this.emit('rename', to, from, kind);

    if (edits) await this.applyLinkEdits(edits, mapping);
  }

  // ------------------------------------------------------------- internals

  /**
   * Serializes a mutation after the previous ones. Code running inside an
   * operation must call the internal do*() methods, never op() again.
   */
  private op<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => {});
    return run;
  }

  /** Resolves once every queued operation and external change has been applied. */
  async settled(): Promise<void> {
    await this.queue;
  }

  private collectLinkEdits(mapping: Map<string, string>) {
    // source (old path) -> links and where they point (old path of the target)
    const result = new Map<string, { link: LinkRef; target: string }[]>();
    for (const file of this.getMarkdownFiles()) {
      const meta = this.cache.getMetadata(file.path);
      if (!meta) continue;
      const sourceMoves = mapping.has(file.path);
      for (const link of meta.links) {
        if (link.target === '') continue;
        const target = this.cache.resolve(link.target, file.path);
        if (!target) continue;
        // Links to moved files, and links inside moved notes whose resolution may break.
        if (mapping.has(target) || sourceMoves) {
          const list = result.get(file.path) ?? [];
          list.push({ link, target });
          result.set(file.path, list);
        }
      }
    }
    return result;
  }

  private async applyLinkEdits(edits: Map<string, { link: LinkRef; target: string }[]>, mapping: Map<string, string>) {
    for (const [oldSource, links] of edits) {
      const source = mapping.get(oldSource) ?? oldSource;
      const text = await this.read(source);
      const changes: TextEdit[] = [];
      for (const { link, target } of links) {
        const newTarget = mapping.get(target) ?? target;
        // Leave links that still resolve correctly untouched.
        if (this.cache.resolve(link.target, source) === newTarget) continue;
        const replacement = retargetLink(link, newTarget, source, this.cache.resolver);
        if (replacement !== null && text.slice(link.from, link.to) === link.raw) {
          changes.push({ from: link.from, to: link.to, insert: replacement });
        }
      }
      if (changes.length) await this.doModify(source, applyEdits(text, changes));
    }
  }

  private async ensureFolder(path: string): Promise<void> {
    path = normalizePath(path);
    if (!path || this.folders.has(path)) return;
    await this.ensureFolder(dirname(path));
    await this.adapter.mkdir(path);
    const folder = toFolder(path);
    this.folders.set(path, folder);
  }

  private registerFile(path: string, content: string | null, size = content?.length ?? 0): VaultFile {
    const now = Date.now();
    const file = toFile({ path, type: 'file', size, ctime: now, mtime: now });
    this.files.set(path, file);
    if (content !== null && isMarkdown(path)) {
      this.remember(path, content);
      this.cache.setContent(path, content);
    } else {
      this.cache.addFile(path);
    }
    this.emit('create', file);
    return file;
  }

  private forget(path: string, kind: 'file' | 'folder') {
    const removed =
      kind === 'file'
        ? [path]
        : this.getFiles()
            .map((f) => f.path)
            .filter((p) => isInside(p, path));
    for (const p of removed) {
      this.files.delete(p);
      this.contents.delete(p);
      this.cache.removeFile(p);
    }
    if (kind === 'folder') for (const f of [...this.folders.keys()]) if (isInside(f, path)) this.folders.delete(f);
    this.emit('delete', path, kind);
  }

  private remember(path: string, text: string) {
    if (text.length <= this.options.maxCachedChars) this.contents.set(path, text);
  }

  private async freeTrashPath(path: string): Promise<string> {
    const name = basename(path);
    let candidate = joinPath(TRASH_DIR, name);
    for (let i = 1; await this.adapter.stat(candidate); i++) {
      const ext = extname(name);
      candidate = joinPath(TRASH_DIR, ext ? `${stem(name)} ${i}.${ext}` : `${name} ${i}`);
    }
    return candidate;
  }

  /** Changes made outside the app. Idempotent: our own writes are recognised and ignored. */
  private async onExternalChange(change: AdapterChange) {
    if (isHidden(change.path)) {
      if (change.type === 'renamed' && !isHidden(change.oldPath) && this.exists(change.oldPath)) {
        this.forget(change.oldPath, change.kind);
      }
      return;
    }
    switch (change.type) {
      case 'created':
      case 'modified': {
        if (change.kind === 'folder') {
          if (!this.folders.has(change.path)) await this.ensureKnownFolder(change.path);
          return;
        }
        const stat = await this.adapter.stat(change.path);
        if (!stat) return;
        await this.ensureKnownFolder(dirname(change.path));
        const known = this.files.get(change.path);
        if (!isMarkdown(change.path)) {
          if (!known) this.registerFile(change.path, null, stat.size);
          else known.stat = stat;
          return;
        }
        const text = await this.adapter.read(change.path);
        if (!known) {
          this.files.set(change.path, toFile(stat));
          this.remember(change.path, text);
          this.cache.setContent(change.path, text);
          this.emit('create', this.files.get(change.path)!);
        } else if (this.contents.get(change.path) !== text) {
          known.stat = stat;
          this.remember(change.path, text);
          this.cache.setContent(change.path, text);
          this.emit('modify', known, text);
        }
        return;
      }
      case 'deleted':
        if (this.exists(change.path)) this.forget(change.path, this.files.has(change.path) ? 'file' : 'folder');
        return;
      case 'renamed': {
        if (this.exists(change.path) || !this.exists(change.oldPath)) return;
        const kind = this.files.has(change.oldPath) ? 'file' : 'folder';
        const moved =
          kind === 'file'
            ? [change.oldPath]
            : this.getFiles()
                .map((f) => f.path)
                .filter((p) => isInside(p, change.oldPath));
        for (const oldPath of moved) {
          const newPath = change.path + oldPath.slice(change.oldPath.length);
          const file = this.files.get(oldPath)!;
          this.files.delete(oldPath);
          this.files.set(newPath, toFile({ ...file.stat, path: newPath }));
          const text = this.contents.get(oldPath);
          this.contents.delete(oldPath);
          if (text !== undefined) this.contents.set(newPath, text);
          this.cache.renameFile(oldPath, newPath);
        }
        if (kind === 'folder') {
          for (const folder of [...this.folders.keys()].filter((p) => isInside(p, change.oldPath))) {
            this.folders.delete(folder);
            const next = change.path + folder.slice(change.oldPath.length);
            this.folders.set(next, toFolder(next));
          }
        }
        this.emit('rename', change.path, change.oldPath, kind);
      }
    }
  }

  private async ensureKnownFolder(path: string) {
    if (!path || this.folders.has(path)) return;
    await this.ensureKnownFolder(dirname(path));
    this.folders.set(path, toFolder(path));
  }
}

function toFile(stat: FileStat): VaultFile {
  return {
    path: stat.path,
    name: basename(stat.path),
    basename: stem(stat.path),
    extension: extname(stat.path),
    parent: dirname(stat.path),
    stat: { ...stat, type: 'file' },
  };
}

function toFolder(path: string): VaultFolder {
  return { path, name: basename(path), parent: dirname(path) };
}
