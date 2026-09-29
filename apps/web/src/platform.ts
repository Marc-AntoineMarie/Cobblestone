import { createStore, del, get, set } from 'idb-keyval';
import { MemoryAdapter, type VaultAdapter } from '@cobblestone/core';
import { demoVaultFiles, type Platform, type VaultEntry } from '@cobblestone/app';
import { DirectoryHandleAdapter } from './directory-adapter';

/*
 * Web host. Vaults are either real folders picked by the user (Chromium's
 * File System Access API, which can open an existing Obsidian vault) or
 * folders in the browser's private storage (OPFS, every modern browser).
 */

const db = createStore('cobblestone', 'kv');
const ENTRIES = 'vaults';
const handleKey = (id: string) => `handle:${id}`;

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemHandle {
    queryPermission?(options: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission?(options: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  }
}

async function entries(): Promise<VaultEntry[]> {
  return (await get<VaultEntry[]>(ENTRIES, db)) ?? [];
}

async function saveEntry(entry: VaultEntry) {
  const list = (await entries()).filter((e) => e.id !== entry.id);
  await set(ENTRIES, [...list, entry], db);
}

async function browserVaultsRoot(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle('vaults', { create: true });
}

const supportsFolders = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
const supportsOpfs = typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory;

export const DEMO_ENTRY: VaultEntry = { id: 'demo', name: 'Demo', kind: 'demo', lastOpened: 0 };

export const webPlatform: Platform = {
  kind: 'web',
  capabilities: { openFolder: supportsFolders, browserStorage: supportsOpfs },

  recentVaults: entries,

  async pickFolder() {
    if (!window.showDirectoryPicker) return null;
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker({ id: 'cobblestone-vault', mode: 'readwrite' });
    } catch {
      return null; // cancelled
    }
    // Reuse the entry if this folder was opened before.
    for (const entry of await entries()) {
      const known = await get<FileSystemDirectoryHandle>(handleKey(entry.id), db);
      if (known && (await known.isSameEntry(handle))) {
        entry.lastOpened = Date.now();
        await saveEntry(entry);
        return entry;
      }
    }
    const entry: VaultEntry = { id: crypto.randomUUID(), name: handle.name, kind: 'folder', lastOpened: Date.now() };
    await set(handleKey(entry.id), handle, db);
    await saveEntry(entry);
    return entry;
  },

  async createVault(name) {
    const clean = name.replace(/[\\/:*?"<>|]/g, '').trim() || 'Vault';
    const entry: VaultEntry = { id: crypto.randomUUID(), name: clean, kind: 'browser', lastOpened: Date.now() };
    await (await browserVaultsRoot()).getDirectoryHandle(entry.id, { create: true });
    await saveEntry(entry);
    return entry;
  },

  async openVault(entry): Promise<VaultAdapter> {
    if (entry.kind === 'demo') return new MemoryAdapter(entry.name, demoVaultFiles(navigator.language));
    let handle: FileSystemDirectoryHandle | undefined;
    if (entry.kind === 'browser') {
      handle = await (await browserVaultsRoot()).getDirectoryHandle(entry.id, { create: true });
    } else {
      handle = await get<FileSystemDirectoryHandle>(handleKey(entry.id), db);
      if (!handle) throw new Error('This folder is no longer available. Open it again.');
      // Browsers forget folder permission between sessions: ask again (needs a click).
      const mode = { mode: 'readwrite' as const };
      if ((await handle.queryPermission?.(mode)) !== 'granted' && (await handle.requestPermission?.(mode)) !== 'granted') {
        throw new Error('Permission to open this folder was not granted.');
      }
    }
    await saveEntry({ ...entry, lastOpened: Date.now() });
    return new DirectoryHandleAdapter(handle, entry.name);
  },

  async forgetVault(id) {
    const entry = (await entries()).find((e) => e.id === id);
    await set(ENTRIES, (await entries()).filter((e) => e.id !== id), db);
    await del(handleKey(id), db);
    // Browser vaults live only here: forgetting one deletes it.
    if (entry?.kind === 'browser') await (await browserVaultsRoot()).removeEntry(id, { recursive: true }).catch(() => undefined);
  },

  openExternal(url) {
    if (/^(https?|mailto):/i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
  },

  storage: {
    get: <T,>(key: string) => get<T>(`storage:${key}`, db),
    set: <T,>(key: string, value: T) => set(`storage:${key}`, value, db),
  },
};
