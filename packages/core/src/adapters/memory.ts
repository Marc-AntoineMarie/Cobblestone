import type { AdapterChange, FileStat, VaultAdapter } from '../adapter';
import { dirname, isInside, normalizePath } from '../path';

type Entry = { type: 'file'; data: Uint8Array; ctime: number; mtime: number } | { type: 'folder'; ctime: number; mtime: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** In-memory vault storage, used by tests, demos and as a scratch vault. */
export class MemoryAdapter implements VaultAdapter {
  private entries = new Map<string, Entry>();
  private listeners = new Set<(change: AdapterChange) => void>();

  constructor(
    readonly name = 'Memory',
    files: Record<string, string | Uint8Array> = {},
  ) {
    for (const [path, content] of Object.entries(files)) {
      this.put(normalizePath(path), typeof content === 'string' ? encoder.encode(content) : content);
    }
  }

  async list(): Promise<FileStat[]> {
    return [...this.entries.keys()].map((path) => this.statSync(path)!);
  }

  async stat(path: string): Promise<FileStat | null> {
    return this.statSync(normalizePath(path));
  }

  async read(path: string): Promise<string> {
    return decoder.decode(await this.readBinary(path));
  }

  async readBinary(path: string): Promise<Uint8Array> {
    const entry = this.entries.get(normalizePath(path));
    if (!entry || entry.type !== 'file') throw new Error(`File not found: ${path}`);
    return entry.data;
  }

  async write(path: string, data: string): Promise<void> {
    await this.writeBinary(path, encoder.encode(data));
  }

  async writeBinary(path: string, data: Uint8Array): Promise<void> {
    path = normalizePath(path);
    const existed = this.entries.has(path);
    this.put(path, data);
    this.notify({ type: existed ? 'modified' : 'created', path, kind: 'file' });
  }

  async mkdir(path: string): Promise<void> {
    this.mkdirSync(normalizePath(path));
  }

  async remove(path: string): Promise<void> {
    path = normalizePath(path);
    const entry = this.entries.get(path);
    if (!entry) return;
    for (const key of [...this.entries.keys()]) if (isInside(key, path)) this.entries.delete(key);
    this.notify({ type: 'deleted', path, kind: entry.type });
  }

  async rename(from: string, to: string): Promise<void> {
    from = normalizePath(from);
    to = normalizePath(to);
    const entry = this.entries.get(from);
    if (!entry) throw new Error(`Not found: ${from}`);
    if (this.entries.has(to)) throw new Error(`Already exists: ${to}`);
    this.mkdirSync(dirname(to));
    for (const [key, value] of [...this.entries]) {
      if (!isInside(key, from)) continue;
      this.entries.delete(key);
      this.entries.set(to + key.slice(from.length), value);
    }
    this.notify({ type: 'renamed', path: to, oldPath: from, kind: entry.type });
  }

  watch(listener: (change: AdapterChange) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private mkdirSync(path: string) {
    if (!path || this.entries.has(path)) return;
    this.mkdirSync(dirname(path));
    const now = Date.now();
    this.entries.set(path, { type: 'folder', ctime: now, mtime: now });
  }

  private put(path: string, data: Uint8Array) {
    this.mkdirSync(dirname(path));
    const now = Date.now();
    const previous = this.entries.get(path);
    this.entries.set(path, { type: 'file', data, ctime: previous?.ctime ?? now, mtime: now });
  }

  private statSync(path: string): FileStat | null {
    const entry = this.entries.get(path);
    if (!entry) return null;
    return {
      path,
      type: entry.type,
      size: entry.type === 'file' ? entry.data.byteLength : 0,
      ctime: entry.ctime,
      mtime: entry.mtime,
    };
  }

  private notify(change: AdapterChange) {
    for (const listener of this.listeners) listener(change);
  }
}
