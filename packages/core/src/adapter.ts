/**
 * Storage backend of a vault. Every platform provides one:
 * - desktop: the real file system (Node, through Electron IPC)
 * - web: a folder picked by the user (File System Access API) or the
 *   browser's private storage (OPFS)
 * - tests / demo: in memory
 *
 * All paths are vault-relative POSIX paths (see path.ts).
 */
export interface FileStat {
  path: string;
  type: 'file' | 'folder';
  size: number;
  /** Creation time (ms since epoch), 0 if unknown. */
  ctime: number;
  /** Modification time (ms since epoch). */
  mtime: number;
}

export type AdapterChange =
  | { type: 'created' | 'modified' | 'deleted'; path: string; kind: 'file' | 'folder' }
  | { type: 'renamed'; path: string; oldPath: string; kind: 'file' | 'folder' };

export interface VaultAdapter {
  /** Human readable name of the vault (usually the root folder name). */
  readonly name: string;
  /** Recursive listing of every file and folder, hidden entries included. */
  list(): Promise<FileStat[]>;
  stat(path: string): Promise<FileStat | null>;
  read(path: string): Promise<string>;
  readBinary(path: string): Promise<Uint8Array>;
  /** Creates parent folders as needed. */
  write(path: string, data: string): Promise<void>;
  writeBinary(path: string, data: Uint8Array): Promise<void>;
  mkdir(path: string): Promise<void>;
  /** Removes a file, or a folder recursively. */
  remove(path: string): Promise<void>;
  /** Moves a file or folder; creates the destination's parent folders. */
  rename(from: string, to: string): Promise<void>;
  /**
   * Subscribes to changes made outside the app (another editor, git, sync...).
   * Optional: adapters that cannot observe the storage simply omit it.
   */
  watch?(listener: (change: AdapterChange) => void): () => void;
}
