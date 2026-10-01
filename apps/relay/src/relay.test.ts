import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryAdapter, Vault } from '@cobblestone/core';
import { createIdentity, NetworkSet, receiveVault, RelayNetwork, SyncNode, type SyncStore } from '@cobblestone/sync';
import { createRelay } from './relay.ts';

class MemoryStore implements SyncStore {
  state: Uint8Array | null = null;
  async load() {
    return this.state;
  }
  async save(state: Uint8Array) {
    this.state = state;
  }
}

const cleanup: (() => unknown)[] = [];
afterEach(async () => {
  for (const step of cleanup.splice(0).reverse()) await step();
});

async function relay() {
  const server = await createRelay({ port: 0, host: '127.0.0.1' });
  cleanup.push(() => server.close());
  return { server, url: `ws://127.0.0.1:${server.port}` };
}

function network(url: string, device: string) {
  const net = new RelayNetwork(url, device);
  cleanup.push(() => net.close());
  return net;
}

describe('the relay', () => {
  it('pairs two devices that only meet on the Internet, then keeps them in sync', async () => {
    const { url } = await relay();
    const aId = createIdentity('PC portable', 'desktop');
    const aVault = new Vault(new MemoryAdapter('Coffre', { 'Plan.md': '# Plan' }));
    await aVault.load();
    // A reaches the relay through a set of networks, as the app does.
    const aNet = new NetworkSet();
    aNet.add(network(url, aId.id));
    const a = new SyncNode({ vault: aVault, store: new MemoryStore(), identity: aId, network: aNet, saveDelay: 0 });
    await a.start();
    cleanup.push(() => a.stop());
    const pairing = a.startPairing(async () => true);

    const bId = createIdentity('Navigateur', 'web');
    const bNet = network(url, bId.id);
    const joined = await receiveVault(bNet, bId, pairing.code);
    const bVault = new Vault(new MemoryAdapter('Reçu', {}));
    await bVault.load();
    const b = new SyncNode({
      vault: bVault,
      store: new MemoryStore(),
      identity: bId,
      network: bNet,
      syncId: joined.vault.id,
      saveDelay: 0,
    });
    await b.start({ channel: joined.channel, peer: joined.host.id });
    cleanup.push(() => b.stop());
    await pairing.done;

    await vi.waitFor(async () => expect(await bVault.read('Plan.md').catch(() => '')).toBe('# Plan'));
    await bVault.modify('Plan.md', '# Plan\n\nécrit sur B');
    await vi.waitFor(async () => expect(await aVault.read('Plan.md')).toBe('# Plan\n\nécrit sur B'));
  });

  it('tells a device only about the tags it listens for or watches', async () => {
    const { url } = await relay();
    const one = network(url, '0000000000000001');
    const two = network(url, '0000000000000002');
    const seen: string[] = [];
    two.onFound((tag) => seen.push(tag));
    one.listen('vault-a');
    one.listen('vault-b');
    two.watch('vault-b');
    await vi.waitFor(() => expect(seen).toContain('vault-b'));
    two.search();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(seen).not.toContain('vault-a');
  });

  it('refuses a link to a device that does not listen for the tag', async () => {
    const { url } = await relay();
    const one = network(url, '0000000000000001');
    const two = network(url, '0000000000000002');
    let address = '';
    two.onFound((_tag, found) => (address = found));
    one.listen('vault-a');
    two.watch('vault-a');
    await vi.waitFor(() => expect(address).not.toBe(''));
    await expect(two.connect(address, 'vault-autre')).rejects.toThrow();
  });
});
