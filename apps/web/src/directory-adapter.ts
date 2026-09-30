import { dirname, basename, normalizePath, type AdapterChange, type FileStat, type VaultAdapter } from '@cobblestone/core';

/*
 * Vault storage on a FileSystemDirectoryHandle. The same code serves:
 * - a real folder picked by the user (File System Access API, Chromium),
 *   e.g. an existing Obsidian vault;
 * - the browser's private storage (Origin Private File System, all modern browsers).
 */

type Handle = FileSystemDirectoryHandle | FileSystemFileHandle;

interface FileSystemObserverRecord {
  type: 'appeared' | 'disappeared' | 'modified' | 'moved' | 'unknown' | 'errored';
  relativePathComponents: string[];
  relativePathMovedFrom?: string[];
  changedHandle: Handle;
}
declare const FileSystemObserver:
  | (new (callback: (records: FileSystemObserverRecord[]) => void) => {
      observe(handle: FileSystemDirectoryHandle, options?: { recursive?: boolean }): Promise<void>;
      disconnect(): void;
    })
  | undefined;

export class DirectoryHandleAdapter implements VaultAdapter {
  constructor(
    readonly root: FileSystemDirectoryHandle,
    readonly name = root.name,
  ) {}

  private async folder(path: string, create = false): Promise<FileSystemDirectoryHandle> {
    let dir = this.root;
    for (const part of normalizePath(path).split('/').filter(Boolean)) {
      dir = await dir.getDirectoryHandle(part, { create });
    }
    return dir;
  }

  private async file(path: string, create = false): Promise<FileSystemFileHandle> {
    const normalized = normalizePath(path);
    const parent = await this.folder(dirname(normalized), create);
    return parent.getFileHandle(basename(normalized), { create });
  }

  async list(): Promise<FileStat[]> {
    const out: FileStat[] = [];
    const walk = async (dir: FileSystemDirectoryHandle, prefix: string) => {
      const children: Promise<void>[] = [];
      for await (const [name, handle] of entries(dir)) {
        const path = prefix ? `${prefix}/${name}` : name;
        if (handle.kind === 'directory') {
          out.push({ path, type: 'folder', size: 0, ctime: 0, mtime: 0 });
          children.push(walk(handle as FileSystemDirectoryHandle, path));
        } else {
          children.push(
            (handle as FileSystemFileHandle).getFile().then(
              (file) => void out.push({ path, type: 'file', size: file.size, ctime: 0, mtime: file.lastModified }),
              // Unreadable for now (permissions, locked): still listed, opening it says why.
              () => void out.push({ path, type: 'file', size: 0, ctime: 0, mtime: 0 }),
            ),
          );
        }
      }
      await Promise.all(children);
    };
    await walk(this.root, '');
    return out;
  }

  async stat(path: string): Promise<FileStat | null> {
    const normalized = normalizePath(path);
    if (!normalized) return { path: '', type: 'folder', size: 0, ctime: 0, mtime: 0 };
    try {
      const file = await (await this.file(normalized)).getFile();
      return { path: normalized, type: 'file', size: file.size, ctime: 0, mtime: file.lastModified };
    } catch {
      try {
        await this.folder(normalized);
        return { path: normalized, type: 'folder', size: 0, ctime: 0, mtime: 0 };
      } catch {
        return null;
      }
    }
  }

  async read(path: string): Promise<string> {
    return (await (await this.file(path)).getFile()).text();
  }

  async readBinary(path: string): Promise<Uint8Array> {
    return new Uint8Array(await (await (await this.file(path)).getFile()).arrayBuffer());
  }

  async write(path: string, data: string): Promise<void> {
    await this.writeData(path, data);
  }

  async writeBinary(path: string, data: Uint8Array): Promise<void> {
    await this.writeData(path, data);
  }

  private async writeData(path: string, data: string | Uint8Array) {
    const handle = await this.file(path, true);
    const writable = await handle.createWritable();
    await writable.write(data as FileSystemWriteChunkType);
    await writable.close();
  }

  async mkdir(path: string): Promise<void> {
    await this.folder(path, true);
  }

  async remove(path: string): Promise<void> {
    const normalized = normalizePath(path);
    if (!normalized) throw new Error('Refusing to delete the vault root');
    const parent = await this.folder(dirname(normalized));
    await parent.removeEntry(basename(normalized), { recursive: true });
  }

  async rename(from: string, to: string): Promise<void> {
    from = normalizePath(from);
    to = normalizePath(to);
    const stat = await this.stat(from);
    if (!stat) throw new Error(`Not found: ${from}`);
    const handle: Handle = stat.type === 'file' ? await this.file(from) : await this.folder(from);
    const targetParent = await this.folder(dirname(to), true);
    const movable = handle as Handle & { move?: (parent: FileSystemDirectoryHandle, name: string) => Promise<void> };
    if (typeof movable.move === 'function') {
      try {
        await movable.move(targetParent, basename(to));
        return;
      } catch {
        // Some browsers expose move() without supporting it for every handle: copy instead.
      }
    }
    await this.copy(from, to, stat.type);
    await this.remove(from);
  }

  private async copy(from: string, to: string, type: 'file' | 'folder'): Promise<void> {
    if (type === 'file') {
      await this.writeBinary(to, await this.readBinary(from));
      return;
    }
    await this.mkdir(to);
    for await (const [name, handle] of entries(await this.folder(from))) {
      await this.copy(`${from}/${name}`, `${to}/${name}`, handle.kind === 'directory' ? 'folder' : 'file');
    }
  }

  /**
   * Uses FileSystemObserver where available (recent Chromium); otherwise
   * rescans when the window regains focus and every few seconds while visible.
   */
  watch(listener: (change: AdapterChange) => void): () => void {
    if (typeof FileSystemObserver !== 'undefined') {
      const observer = new FileSystemObserver((records) => {
        for (const record of records) {
          const path = record.relativePathComponents.join('/');
          const kind = record.changedHandle?.kind === 'directory' ? 'folder' : 'file';
          if (record.type === 'appeared') listener({ type: 'created', path, kind });
          else if (record.type === 'modified') listener({ type: 'modified', path, kind });
          else if (record.type === 'disappeared') listener({ type: 'deleted', path, kind });
          else if (record.type === 'moved' && record.relativePathMovedFrom)
            listener({ type: 'renamed', path, oldPath: record.relativePathMovedFrom.join('/'), kind });
        }
      });
      observer.observe(this.root, { recursive: true }).catch(() => undefined);
      return () => observer.disconnect();
    }
    return this.pollChanges(listener);
  }

  private pollChanges(listener: (change: AdapterChange) => void): () => void {
    let known = new Map<string, FileStat>();
    let stopped = false;
    let running = false;
    const scan = async (emit: boolean) => {
      if (running || stopped) return;
      running = true;
      try {
        const next = new Map((await this.list()).map((s) => [s.path, s]));
        if (emit) {
          for (const [path, stat] of next) {
            const before = known.get(path);
            if (!before) listener({ type: 'created', path, kind: stat.type });
            else if (stat.type === 'file' && (before.mtime !== stat.mtime || before.size !== stat.size))
              listener({ type: 'modified', path, kind: 'file' });
          }
          for (const [path, stat] of known) if (!next.has(path)) listener({ type: 'deleted', path, kind: stat.type });
        }
        known = next;
      } finally {
        running = false;
      }
    };
    void scan(false);
    const onFocus = () => void scan(true);
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void scan(true);
    }, 5000);
    return () => {
      stopped = true;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }
}

/** `dir.entries()` with a type TypeScript's DOM lib may not declare yet. */
function entries(dir: FileSystemDirectoryHandle): AsyncIterable<[string, Handle]> {
  return (dir as unknown as { entries(): AsyncIterable<[string, Handle]> }).entries();
}
