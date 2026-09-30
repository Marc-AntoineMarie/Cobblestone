import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanNetwork, type LanLink } from './lan';

const networks: LanNetwork[] = [];

/** A network on its own announcement port, so that a running app is not disturbed. */
async function lan(device: string, options: { maxFrame?: number } = {}) {
  const network = new LanNetwork({ port: 47_791, interval: 200, ...options });
  network.device = device;
  await network.start();
  networks.push(network);
  return network;
}

afterEach(() => {
  networks.splice(0).forEach((n) => n.stop());
});

const frames = (link: LanLink) => {
  const heard: Uint8Array[] = [];
  link.onFrame((f) => heard.push(f));
  return heard;
};

describe('LanNetwork', () => {
  it('carries frames both ways, small and large, on a link named by its tag', async () => {
    const a = await lan('a');
    const b = await lan('b');
    b.listen('vault-1');
    const incoming = new Promise<{ link: LanLink; tag: string }>((resolve) =>
      b.onIncoming((link, tag) => resolve({ link, tag })),
    );
    const mine = await a.connect(`127.0.0.1:${b.port}`, 'vault-1');
    const { link: theirs, tag } = await incoming;
    expect(tag).toBe('vault-1');

    const atB = frames(theirs);
    const atA = frames(mine);
    const large = new Uint8Array(5 * 1024 * 1024).map((_, i) => i % 251);
    mine.send(new Uint8Array([1, 2, 3]));
    mine.send(large);
    theirs.send(new Uint8Array([4]));
    await vi.waitFor(() => expect(atB).toHaveLength(2));
    await vi.waitFor(() => expect(atA).toHaveLength(1));
    expect([...atB[0]!]).toEqual([1, 2, 3]);
    expect(atB[1]!.length).toBe(large.length);
    expect(atB[1]!.every((v, i) => v === large[i])).toBe(true);
    expect([...atA[0]!]).toEqual([4]);

    let closed = false;
    theirs.onClose(() => (closed = true));
    mine.close();
    await vi.waitFor(() => expect(closed).toBe(true));
  });

  it('refuses a link for a tag nobody listens for, and a frame too large', async () => {
    const a = await lan('a');
    const b = await lan('b', { maxFrame: 1024 });
    b.listen('vault-1');
    let welcomed = 0;
    b.onIncoming(() => welcomed++);

    const stranger = await a.connect(`127.0.0.1:${b.port}`, 'vault-2');
    let strangerClosed = false;
    stranger.onClose(() => (strangerClosed = true));
    await vi.waitFor(() => expect(strangerClosed).toBe(true));

    const greedy = await a.connect(`127.0.0.1:${b.port}`, 'vault-1');
    let greedyClosed = false;
    greedy.onClose(() => (greedyClosed = true));
    await vi.waitFor(() => expect(welcomed).toBe(1));
    greedy.send(new Uint8Array(4096));
    await vi.waitFor(() => expect(greedyClosed).toBe(true));
  });

  // Multicast may be missing on CI machines; it works on a desktop.
  it.skipIf(!!process.env.CI)('finds the devices that announce a tag on the network', async () => {
    const a = await lan('appareil-a');
    const b = await lan('appareil-b');
    a.listen('vault-1');
    const found: string[] = [];
    b.onFound((tag, address, device) => found.push(`${tag} ${device} ${address.endsWith(`:${a.port}`)}`));
    b.search();
    await vi.waitFor(() => expect(found).toContain('vault-1 appareil-a true'));
  });
});
