import { MemoryAdapter, type AdapterChange, type FileStat, type VaultAdapter } from '@cobblestone/core';
import { demoVaultFiles, type Platform, type VaultEntry } from '@cobblestone/app';
import type { DesktopBridge } from '../preload/index';

declare global {
  interface Window {
    cobblestone: DesktopBridge;
  }
}

const bridge = () => window.cobblestone;

/** Vault storage served by the main process through IPC. */
class IpcAdapter implements VaultAdapter {
  constructor(
    private readonly id: string,
    readonly name: string,
  ) {}

  private call<T>(method: string, ...args: unknown[]): Promise<T> {
    return bridge().fs.call(this.id, method, args) as Promise<T>;
  }

  list = () => this.call<FileStat[]>('list');
  stat = (path: string) => this.call<FileStat | null>('stat', path);
  read = (path: string) => this.call<string>('read', path);
  readBinary = (path: string) => this.call<Uint8Array>('readBinary', path);
  write = (path: string, data: string) => this.call<void>('write', path, data);
  writeBinary = (path: string, data: Uint8Array) => this.call<void>('writeBinary', path, data);
  mkdir = (path: string) => this.call<void>('mkdir', path);
  remove = (path: string) => this.call<void>('remove', path);
  rename = (from: string, to: string) => this.call<void>('rename', from, to);

  watch(listener: (change: AdapterChange) => void): () => void {
    void bridge().fs.watch(this.id);
    const off = bridge().fs.onEvent((vaultId, change) => {
      if (vaultId === this.id) listener(change as AdapterChange);
    });
    return () => {
      off();
      void bridge().fs.unwatch(this.id);
    };
  }
}

export const desktopPlatform: Platform = {
  kind: 'desktop',
  capabilities: { openFolder: true, browserStorage: false },
  recentVaults: async () => (await bridge().vaults.recent()) as VaultEntry[],
  pickFolder: async () => (await bridge().vaults.pick()) as VaultEntry | null,
  createVault: async (name) => (await bridge().vaults.create(name)) as VaultEntry | null,
  forgetVault: async (id) => void (await bridge().vaults.forget(id)),
  openVault: async (entry) => {
    if (entry.kind === 'demo') return new MemoryAdapter(entry.name, demoVaultFiles(navigator.language));
    const { name } = (await bridge().vaults.open(entry.id)) as { name: string };
    return new IpcAdapter(entry.id, name);
  },
  openExternal: (url) => void bridge().openExternal(url),
  storage: {
    get: async <T,>(key: string) => (await bridge().storage.get(key)) as T | undefined,
    set: async <T,>(key: string, value: T) => void (await bridge().storage.set(key, value)),
  },
};
