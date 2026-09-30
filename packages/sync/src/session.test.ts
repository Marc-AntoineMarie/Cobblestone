import { describe, expect, it, vi } from 'vitest';
import { bytePair } from './channel';
import { createIdentity, type DeviceIdentity } from './identity';
import type { SyncMessage } from './protocol';
import { acceptSession, openSession } from './session';
import { seen, tappedPair } from './wire.test-helpers';

const trusting =
  (...devices: DeviceIdentity[]) =>
  (id: string, publicKey: string) =>
    devices.some((d) => d.id === id && d.publicKey === publicKey);

describe('sessions between paired devices', () => {
  it('open with both sides proven, and carry messages both ways', async () => {
    const a = createIdentity('A', 'desktop');
    const b = createIdentity('B', 'desktop');
    const [left, right] = bytePair();
    const accepting = acceptSession(right, { identity: b, vault: 'v', trusts: trusting(a, b) });
    const opened = await openSession(left, { identity: a, vault: 'v', trusts: trusting(a, b) });
    const accepted = await accepting;
    expect(opened.peer).toBe(b.id);
    expect(accepted.peer).toBe(a.id);

    const heard: SyncMessage[] = [];
    accepted.channel.onMessage((m) => heard.push(m));
    opened.channel.onMessage((m) => heard.push(m));
    opened.channel.send({ type: 'blob-request', hash: 'un' });
    accepted.channel.send({ type: 'blob-missing', hash: 'deux' });
    await vi.waitFor(() =>
      expect(heard).toEqual(
        expect.arrayContaining([
          { type: 'blob-request', hash: 'un' },
          { type: 'blob-missing', hash: 'deux' },
        ]),
      ),
    );
  });

  it('refuse a device that was never paired, or that was removed', async () => {
    const a = createIdentity('A', 'desktop');
    const stranger = createIdentity('Inconnu', 'desktop');
    const [left, right] = bytePair();
    const accepting = acceptSession(right, { identity: a, vault: 'v', trusts: trusting(a) });
    const opening = openSession(left, { identity: stranger, vault: 'v', trusts: trusting(a, stranger) });
    await Promise.all([
      expect(opening).rejects.toMatchObject({ code: 'unknown-device' }),
      expect(accepting).rejects.toMatchObject({ code: 'unknown-device' }),
    ]);
  });

  it('refuse a device that shows the key of another without its secret', async () => {
    const a = createIdentity('A', 'desktop');
    const b = createIdentity('B', 'desktop');
    const impostor = { ...createIdentity('Faux A', 'desktop'), id: a.id, publicKey: a.publicKey };
    const [left, right] = bytePair();
    const accepting = acceptSession(right, { identity: b, vault: 'v', trusts: trusting(a, b) });
    const opening = openSession(left, { identity: impostor, vault: 'v', trusts: trusting(a, b) });
    await Promise.all([
      expect(opening).rejects.toMatchObject({ code: 'bad-proof' }),
      expect(accepting).rejects.toMatchObject({ code: 'closed' }),
    ]);
  });

  it('refuse a device that comes for another vault', async () => {
    const a = createIdentity('A', 'desktop');
    const b = createIdentity('B', 'desktop');
    const [left, right] = bytePair();
    const accepting = acceptSession(right, { identity: b, vault: 'v', trusts: trusting(a, b) });
    const opening = openSession(left, { identity: a, vault: 'autre', trusts: trusting(a, b) });
    await Promise.all([
      expect(opening).rejects.toMatchObject({ code: 'wrong-vault' }),
      expect(accepting).rejects.toMatchObject({ code: 'wrong-vault' }),
    ]);
  });

  it('show nothing to whoever records them, and end when a frame is replayed', async () => {
    const a = createIdentity('A', 'desktop');
    const b = createIdentity('B', 'desktop');
    const wire = tappedPair();
    const accepting = acceptSession(wire.right, { identity: b, vault: 'v', trusts: trusting(a, b) });
    const opened = await openSession(wire.left, { identity: a, vault: 'v', trusts: trusting(a, b) });
    const accepted = await accepting;
    const heard: SyncMessage[] = [];
    accepted.channel.onMessage((m) => heard.push(m));
    let closed = false;
    accepted.channel.onClose(() => (closed = true));

    opened.channel.send({ type: 'blob', hash: 'h', data: new TextEncoder().encode('Liste de courses') });
    await vi.waitFor(() => expect(heard).toHaveLength(1));
    expect(seen(wire.frames, 'Liste de courses')).toBe(false);

    wire.replayToRight(wire.frames.at(-1)!);
    await vi.waitFor(() => expect(closed).toBe(true));
    expect(heard).toHaveLength(1);
  });
});
