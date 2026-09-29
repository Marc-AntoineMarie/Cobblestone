import { promises as fs, type Stats } from 'node:fs';
import path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import { isHidden, normalizePath, type AdapterChange, type FileStat, type VaultAdapter } from '@cobblestone/core';

/**
 * Vault storage on the local file system (desktop app, self-hosted server,
 * command line tools). Every path is checked to stay inside the vault root.
 */
export class NodeFsAdapter implements VaultAdapter {
  readonly root: string;

  constructor(
    root: string,
    readonly name = path.basename(path.resolve(root)),
  ) {
    this.root = path.resolve(root);
  }

  /** Absolute path for a vault path; refuses anything escaping the root. */
  resolve(vaultPath: string): string {
    const normalized = normalizePath(vaultPath);
    const absolute = normalized ? path.join(this.root, ...normalized.split('/')) : this.root;
    if (absolute !== this.root && !absolute.startsWith(this.root + path.sep)) {
      throw new Error(`Path escapes the vault: ${vaultPath}`);
    }
    return absolute;
  }

  private toVaultPath(absolute: string): string {
    return path.relative(this.root, absolute).split(path.sep).join('/');
  }

  /**
   * Creates the folders above a vault path, never the vault root itself: when
   * the vault's folder was renamed or moved away, a late save must not recreate
   * an empty copy at the old place.
   */
  private async makeParents(target: string) {
    await fs.access(this.root);
    await fs.mkdir(path.dirname(target), { recursive: true });
  }

  private rootExists(): Promise<boolean> {
    return fs.stat(this.root).then(
      (stat) => stat.isDirectory(),
      () => false,
    );
  }

  async list(): Promise<FileStat[]> {
    const entries = await fs.readdir(this.root, { recursive: true, withFileTypes: true });
    const out: FileStat[] = [];
    const wanted = entries.filter((e) => e.isFile() || e.isDirectory());
    for (let i = 0; i < wanted.length; i += 256) {
      const batch = wanted.slice(i, i + 256);
      const stats = await Promise.all(batch.map((entry) => fs.stat(path.join(entry.parentPath, entry.name)).catch(() => null)));
      batch.forEach((entry, k) => {
        const stat = stats[k];
        if (stat) out.push(toStat(this.toVaultPath(path.join(entry.parentPath, entry.name)), stat));
      });
    }
    return out;
  }

  async stat(vaultPath: string): Promise<FileStat | null> {
    try {
      return toStat(normalizePath(vaultPath), await fs.stat(this.resolve(vaultPath)));
    } catch {
      return null;
    }
  }

  read(vaultPath: string): Promise<string> {
    return fs.readFile(this.resolve(vaultPath), 'utf8');
  }

  async readBinary(vaultPath: string): Promise<Uint8Array> {
    return new Uint8Array(await fs.readFile(this.resolve(vaultPath)));
  }

  async write(vaultPath: string, data: string): Promise<void> {
    const target = this.resolve(vaultPath);
    await this.makeParents(target);
    await fs.writeFile(target, data, 'utf8');
  }

  async writeBinary(vaultPath: string, data: Uint8Array): Promise<void> {
    const target = this.resolve(vaultPath);
    await this.makeParents(target);
    await fs.writeFile(target, data);
  }

  async mkdir(vaultPath: string): Promise<void> {
    await fs.access(this.root);
    await fs.mkdir(this.resolve(vaultPath), { recursive: true });
  }

  async remove(vaultPath: string): Promise<void> {
    const target = this.resolve(vaultPath);
    if (target === this.root) throw new Error('Refusing to delete the vault root');
    await fs.rm(target, { recursive: true, force: true });
  }

  async rename(from: string, to: string): Promise<void> {
    const source = this.resolve(from);
    const target = this.resolve(to);
    await this.makeParents(target);
    await fs.rename(source, target);
  }

  watch(listener: (change: AdapterChange) => void): () => void {
    const watcher: FSWatcher = watch(this.root, {
      ignoreInitial: true,
      ignored: (absolute: string) => {
        const relative = this.toVaultPath(absolute);
        return relative !== '' && isHidden(relative);
      },
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    });
    // When the vault's own folder is renamed or moved, the watcher reports every
    // file as deleted: those events are dropped, the notes are not gone.
    // Changes stay in order while a deletion is being checked.
    let queue = Promise.resolve();
    const emit = (type: 'created' | 'modified' | 'deleted', kind: 'file' | 'folder') => (absolute: string) => {
      const change: AdapterChange = { type, kind, path: this.toVaultPath(absolute) };
      queue = queue.then(async () => {
        if (type === 'deleted' && (change.path === '' || !(await this.rootExists()))) return;
        listener(change);
      });
    };
    watcher
      .on('add', emit('created', 'file'))
      .on('addDir', emit('created', 'folder'))
      .on('change', emit('modified', 'file'))
      .on('unlink', emit('deleted', 'file'))
      .on('unlinkDir', emit('deleted', 'folder'));
    return () => void watcher.close();
  }
}

function toStat(vaultPath: string, stat: Stats): FileStat {
  return {
    path: vaultPath,
    type: stat.isDirectory() ? 'folder' : 'file',
    size: stat.isDirectory() ? 0 : stat.size,
    ctime: stat.birthtimeMs || stat.ctimeMs,
    mtime: stat.mtimeMs,
  };
}
