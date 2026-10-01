import { describe, expect, it, vi } from 'vitest';
import { AccountLink, type VaultOffer } from './account-link';
import { createIdentity, publicInfo, type DeviceInfo } from './identity';
import { MemoryNetworkHub } from './network';

function device(hub: MemoryNetworkHub, name: string, offers: VaultOffer[] = [], accept = false) {
  const identity = createIdentity(name, 'desktop');
  const state = {
    identity,
    trusted: [] as DeviceInfo[],
    offered: [] as string[],
    asked: [] as string[],
    shown: [] as (string | null)[],
  };
  const link = new AccountLink({
    network: hub.node(identity.id),
    identity,
    trusted: () => state.trusted,
    offers: () => offers,
    ask: async (d, check) => (state.asked.push(`${d.name} ${check}`), accept),
    waiting: (check) => state.shown.push(check),
    trust: (devices) => {
      for (const d of devices) if (!state.trusted.some((t) => t.id === d.id)) state.trusted.push(d);
    },
    offered: (from, list) => state.offered.push(...list.map((o) => `${o.name} (${from.name})`)),
  });
  return { ...state, state, link };
}

describe('the devices of an account', () => {
  it('let a new device in once the user compares the same check on both', async () => {
    const hub = new MemoryNetworkHub();
    const laptop = device(hub, 'PC portable', [{ id: 'v1', name: 'Mes notes' }], true);
    laptop.state.trusted.push(publicInfo(createIdentity('Ancien', 'desktop')));
    laptop.link.start();
    const desktop = device(hub, 'PC fixe');
    desktop.link.start();
    hub.announce();
    await vi.waitFor(() => expect(desktop.state.offered).toEqual(['Mes notes (PC portable)']));
    const asked = laptop.state.asked[0]!;
    expect(asked).toMatch(/^PC fixe \d{3} \d{3}$/);
    expect(desktop.state.shown).toContain(asked.slice('PC fixe '.length));
    expect(laptop.state.trusted.map((d) => d.name)).toContain('PC fixe');
    expect(desktop.state.trusted.map((d) => d.name).sort()).toEqual(['Ancien', 'PC portable']);
  });

  it('give nothing to a device the user does not let in', async () => {
    const hub = new MemoryNetworkHub();
    const laptop = device(hub, 'PC portable', [{ id: 'v1', name: 'Mes notes' }], false);
    laptop.state.trusted.push(publicInfo(createIdentity('Ancien', 'desktop')));
    laptop.link.start();
    const stranger = device(hub, 'Inconnu');
    stranger.link.start();
    hub.announce();
    await vi.waitFor(() => expect(laptop.state.asked).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(stranger.state.offered).toEqual([]);
    expect(stranger.state.trusted).toEqual([]);
    expect(laptop.state.trusted.map((d) => d.name)).toEqual(['Ancien']);
  });
});
