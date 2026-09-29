import type { VaultAdapter } from '@cobblestone/core';

/**
 * A vault the user has opened before.
 * - "folder": a real folder on disk (desktop) or picked through the browser
 * - "browser": stored in the browser's private storage (web only)
 * - "demo": sample content kept in memory
 */
export interface VaultEntry {
  id: string;
  name: string;
  kind: 'folder' | 'browser' | 'demo';
  /** Absolute folder path on desktop; undefined on the web. */
  location?: string;
  lastOpened: number;
  /** Desktop, in the recent list: the folder is no longer where it was. */
  missing?: boolean;
}

/** Where a renamed or moved vault folder was found. */
export interface MovedVault {
  name: string;
  location: string;
}

/**
 * Everything the shared UI needs from its host. The web app and the desktop
 * app each provide one; neither depends on the other.
 */
export interface Platform {
  kind: 'web' | 'desktop';
  /** What this host can do, so the UI only offers what works. */
  capabilities: {
    /** Open an existing folder (e.g. an Obsidian vault). */
    openFolder: boolean;
    /** Create vaults inside the browser's private storage. */
    browserStorage: boolean;
  };
  recentVaults(): Promise<VaultEntry[]>;
  /** Asks the user for a folder; null when cancelled. */
  pickFolder(): Promise<VaultEntry | null>;
  /** Creates an empty vault; on desktop the user chooses where. */
  createVault(name: string): Promise<VaultEntry | null>;
  /** Opens storage for a known vault. May prompt for permission on the web. */
  openVault(entry: VaultEntry): Promise<VaultAdapter>;
  forgetVault(id: string): Promise<void>;
  /** Desktop: looks for the folder of a vault that was renamed or moved; null when not found. */
  findMovedVault?(entry: VaultEntry): Promise<MovedVault | null>;
  /**
   * Points a vault to its folder's new place: the one findMovedVault found,
   * or else one the user picks. The vault keeps its tabs and settings.
   * Null when the user cancels.
   */
  relocateVault(entry: VaultEntry, found?: MovedVault): Promise<VaultEntry | null>;
  /** Desktop: the folder of an open vault disappeared (true) or came back (false). */
  onVaultMissing?(listener: (vaultId: string, missing: boolean) => void): () => void;
  openExternal(url: string): void;
  /** Small persistent key/value store for settings and workspace layout. */
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
  };
}
