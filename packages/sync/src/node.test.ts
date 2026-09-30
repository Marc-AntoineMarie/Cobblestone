import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter, Vault } from '@cobblestone/core';
import { createIdentity, type DeviceIdentity } from './identity';
import { MemoryNetworkHub } from './network';
import { receiveVault, SyncNode } from './node';
import type { SyncStore } from './vault-sync';

class MemoryStore implements SyncStore {
  state: Uint8Array | null = null;
  async load() {
    return this.state;
  }
  async save(state: Uint8Array) {
    this.state = state;
  }
}

interface Device {
  identity: DeviceIdentity;
  network: ReturnType<MemoryNetworkHub['node']>;
  vault: Vault;
  node: SyncNode;
  store: MemoryStore;
}

let hub: MemoryNetworkHub;

async function device(name: string, files: Record<string, string> = {}, syncId?: string) {
  const identity = createIdentity(name, 'desktop');
  const network = hub.node(identity.id);
  const vault = new Vault(new MemoryAdapter(name, files));
  await vault.load();
  const store = new MemoryStore();
  const node = new SyncNode({ vault, store, identity, network, syncId, saveDelay: 0 });
  return { identity, network, vault, node, store } satisfies Device;
}

/** A new device receives the vault from `host`, the user of `host` accepting it. */
async function join(host: Device, name: string) {
  const pairing = host.node.startPairing(async () => true);
  const identity = createIdentity(name, 'desktop');
  const network = hub.node(identity.id);
  const joined = await receiveVault(network, identity, pairing.code);
  const vault = new Vault(new MemoryAdapter(name, {}));
  await vault.load();
  const store = new MemoryStore();
  const node = new SyncNode({ vault, store, identity, network, syncId: joined.vault.id, saveDelay: 0 });
  await node.start({ channel: joined.channel, peer: joined.host.id });
  await pairing.done;
  return { identity, network, vault, node, store } satisfies Device;
}

async function settle(...devices: Device[]) {
  for (let round = 0; round < 8; round++) {
    hub.announce();
    await new Promise((resolve) => setTimeout(resolve, 5));
    for (const d of devices) await d.node.sync.settled();
  }
}

const files = async (d: Device) =>
  Object.fromEntries(await Promise.all(d.vault.getFiles().map(async (f) => [f.path, await d.vault.read(f.path)] as const)));

const online = (d: Device) =>
  d.node
    .devices()
    .filter((x) => x.online)
    .map((x) => x.name)
    .sort();

describe('SyncNode', () => {
  it('pairs a new device with a code and brings it the vault', async () => {
    hub = new MemoryNetworkHub();
    const a = await device('PC portable', { 'Plan.md': '# Plan' });
    await a.node.start();
    let asked = '';
    const pairing = a.node.startPairing(async (d) => ((asked = d.name), true));
    const identity = createIdentity('PC fixe', 'desktop');
    const network = hub.node(identity.id);
    let proven = false;
    const joined = await receiveVault(network, identity, pairing.code, { onProven: () => (proven = true) });
    expect(proven).toBe(true);
    expect(joined.vault).toEqual({ id: a.node.syncId, name: 'PC portable' });

    const vault = new Vault(new MemoryAdapter('Reçu', {}));
    await vault.load();
    const store = new MemoryStore();
    const b = {
      identity,
      network,
      vault,
      store,
      node: new SyncNode({ vault, store, identity, network, syncId: joined.vault.id, saveDelay: 0 }),
    };
    await b.node.start({ channel: joined.channel, peer: joined.host.id });
    expect(await pairing.done).toMatchObject({ name: 'PC fixe' });
    expect(asked).toBe('PC fixe');
    await settle(a, b);

    expect(await files(b)).toEqual({ 'Plan.md': '# Plan' });
    expect(
      b.node
        .devices()
        .map((d) => d.name)
        .sort(),
    ).toEqual(['PC fixe', 'PC portable']);
    expect(online(a)).toEqual(['PC fixe']);
    expect(b.node.syncId).toBe(a.node.syncId);
  });

  it('keeps edits made during a pause, and sends them on resuming', async () => {
    hub = new MemoryNetworkHub();
    const a = await device('A', { 'Note.md': 'un' });
    await a.node.start();
    const b = await join(a, 'B');
    await settle(a, b);
    a.node.pause();
    expect(a.node.paused).toBe(true);
    await a.vault.modify('Note.md', 'un deux');
    await settle(a, b);
    expect(await b.vault.read('Note.md')).toBe('un');
    a.node.resume();
    await settle(a, b);
    expect(await b.vault.read('Note.md')).toBe('un deux');
  });

  it('finds the devices of the vault again by itself after a restart', async () => {
    hub = new MemoryNetworkHub();
    const a = await device('A', { 'Note.md': 'un' });
    await a.node.start();
    const b = await join(a, 'B');
    await settle(a, b);
    // B leaves the network (laptop closed), A writes, B comes back with a new link.
    b.network.unplug();
    await a.vault.modify('Note.md', 'un deux');
    await settle(a, b);
    expect(online(a)).toEqual([]);
    await b.node.stop();
    const back = hub.node(b.identity.id);
    const again = new SyncNode({ vault: b.vault, store: b.store, identity: b.identity, network: back, saveDelay: 0 });
    await again.start();
    const b2 = { ...b, network: back, node: again };
    await settle(a, b2);
    expect(await b.vault.read('Note.md')).toBe('un deux');
    expect(online(a)).toEqual(['B']);
  });

  it('lets a third device in through any device, and shuts out a removed one', async () => {
    hub = new MemoryNetworkHub();
    const a = await device('A', { 'Note.md': 'début' });
    await a.node.start();
    const b = await join(a, 'B');
    await settle(a, b);
    const c = await join(b, 'C');
    await settle(a, b, c);
    // A never saw C's code, but trusts it through the vault's list of devices.
    await vi.waitFor(async () => {
      hub.announce();
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(online(a)).toEqual(['B', 'C']);
    });

    // C writes at once, before it hears of its removal: A and B do not take it.
    a.node.removeDevice(c.identity.id);
    await c.vault.modify('Note.md', 'début, écrit par C après son retrait');
    await settle(a, b, c);
    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle(a, b, c);
    expect(online(a)).toEqual(['B']);
    expect(online(b)).toEqual(['A']);
    expect(c.node.removed).toBe(true);
    expect(await a.vault.read('Note.md')).toBe('début');
    expect(await b.vault.read('Note.md')).toBe('début');
  });

  it('finds the devices it knew again after losing its sync state, keeping both versions of what differs', async () => {
    hub = new MemoryNetworkHub();
    const a = await device('A', { 'Note.md': 'un' });
    await a.node.start();
    const b = await join(a, 'B');
    await settle(a, b);
    const known = b.node.devices().filter((d) => !d.self);
    await b.node.stop();
    await a.vault.modify('Note.md', 'un deux');
    // B's .cobblestone/sync is gone: a fresh store, but it remembers A.
    const again = new SyncNode({
      vault: b.vault,
      store: new MemoryStore(),
      identity: b.identity,
      network: b.network,
      syncId: b.node.syncId,
      known,
      saveDelay: 0,
    });
    await again.start();
    await settle(a, { ...b, node: again });
    const texts = await Promise.all(b.vault.getFiles().map((f) => b.vault.read(f.path)));
    expect(texts.sort()).toEqual(['un', 'un deux']);
    expect(online(a)).toEqual(['B']);
  });

  it('ends a pairing after three wrong codes, or when the user declines', async () => {
    hub = new MemoryNetworkHub();
    const a = await device('A');
    await a.node.start();
    const pairing = a.node.startPairing(async () => true);
    for (let i = 0; i < 3; i++) {
      const identity = createIdentity(`Faux ${i}`, 'desktop');
      await expect(receiveVault(hub.node(identity.id), identity, 'AAAAAAAAA', { timeout: 200 })).rejects.toMatchObject({
        code: 'wrong-code',
      });
    }
    await expect(pairing.done).rejects.toMatchObject({ code: 'wrong-code' });

    const declining = a.node.startPairing(async () => false);
    const identity = createIdentity('Refusé', 'desktop');
    await Promise.all([
      expect(receiveVault(hub.node(identity.id), identity, declining.code)).rejects.toMatchObject({ code: 'declined' }),
      expect(declining.done).rejects.toMatchObject({ code: 'declined' }),
    ]);
    expect(a.node.devices().map((d) => d.name)).toEqual(['A']);
  });
});
