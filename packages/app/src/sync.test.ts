import { describe, expect, it } from 'vitest';
import { MemoryAdapter } from '@cobblestone/core';
import type { Platform } from './platform';
import { BackgroundSyncManager } from './sync';

/** A desktop host with one known vault, syncing without a relay and without a local network. */
function platformStub(): Platform {
  const store = new Map<string, unknown>([
    ['sync:relay', { enabled: false, url: '' }],
    ['sync:vaults', { v1: { syncId: 'sync-1' } }],
  ]);
  return {
    kind: 'desktop',
    storage: {
      get: async <T>(key: string) => store.get(key) as T | undefined,
      set: async <T>(key: string, value: T) => void store.set(key, value),
    },
    recentVaults: async () => [{ id: 'v1', name: 'Coffre', kind: 'folder', location: '/coffre', lastOpened: 0 }],
    openVaultSilent: async () => {
      // Opening a vault takes a moment, as reading a folder does.
      await Promise.resolve();
      return new MemoryAdapter('Coffre', { 'Note.md': 'un' });
    },
  } as unknown as Platform;
}

describe('syncing the vaults in the background', () => {
  it('syncs a vault no open session has', async () => {
    const background = new BackgroundSyncManager();
    await background.start(platformStub());
    expect(background.vaults()).toEqual(['v1']);
    background.stop();
  });

  it('leaves the open session its vault, even when taken over while starting', async () => {
    const background = new BackgroundSyncManager();
    const starting = background.start(platformStub());
    // The vault opens meanwhile: its session takes over before the background node is there.
    await background.release('v1');
    await starting;
    // Two nodes on one vault would send back through the files what the other wrote.
    expect(background.vaults()).toEqual([]);
    background.stop();
  });
});
