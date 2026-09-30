import { describe, expect, it, vi } from 'vitest';
import { bytePair } from './channel';
import { createIdentity, type DeviceInfo } from './identity';
import { CODE_LENGTH, formatCode, hostPairing, joinPairing, pairingCode, readCode } from './pairing';
import type { SyncMessage } from './protocol';
import { seen, tappedPair } from './wire.test-helpers';

const vault = { id: 'coffre-1', name: 'Mes notes' };

describe('pairing codes', () => {
  it('are nine symbols without letters that look like digits', () => {
    for (let i = 0; i < 50; i++) expect(pairingCode()).toMatch(/^[0-9A-HJKMNP-TV-Z]{9}$/);
    expect(CODE_LENGTH).toBe(9);
    expect(formatCode('K7M4QX92P')).toBe('K7M 4QX 92P');
  });

  it('read what was typed, whatever the case, spaces and look-alike letters', () => {
    expect(readCode('k7m-4qx 92p')).toBe('K7M4QX92P');
    expect(readCode('O1I L23 456')).toBe('011123456');
    expect(readCode('K7M 4QX')).toBeNull();
    expect(readCode('K7M 4QX 92U')).toBeNull();
  });
});

describe('pairing', () => {
  it('joins two devices that share the code, then carries the vault on the same link', async () => {
    const host = createIdentity('PC portable', 'desktop');
    const guest = createIdentity('PC fixe', 'desktop');
    const code = pairingCode();
    const [a, b] = bytePair();
    let asked: DeviceInfo | null = null;
    const hosting = hostPairing(a, { code, identity: host, vault, approve: async (d) => ((asked = d), true) });
    const joined = await joinPairing(b, { code, identity: guest });
    const hosted = await hosting;

    expect(asked).toMatchObject({ id: guest.id, name: 'PC fixe' });
    expect(hosted.device).toEqual({ id: guest.id, name: 'PC fixe', kind: 'desktop', publicKey: guest.publicKey });
    expect(joined.host).toMatchObject({ id: host.id, name: 'PC portable' });
    expect(joined.vault).toEqual(vault);

    const toGuest: SyncMessage[] = [];
    const toHost: SyncMessage[] = [];
    joined.channel.onMessage((m) => toGuest.push(m));
    hosted.channel.onMessage((m) => toHost.push(m));
    hosted.channel.send({ type: 'blob-request', hash: 'ab' });
    joined.channel.send({ type: 'update', update: new Uint8Array([1, 2, 3]) });
    await vi.waitFor(() => expect(toGuest).toEqual([{ type: 'blob-request', hash: 'ab' }]));
    await vi.waitFor(() => expect(toHost).toEqual([{ type: 'update', update: new Uint8Array([1, 2, 3]) }]));
  });

  it('refuses a wrong code on both sides, without asking the user', async () => {
    const [a, b] = bytePair();
    let asked = false;
    const hosting = hostPairing(a, {
      code: 'K7M4QX92P',
      identity: createIdentity('A', 'desktop'),
      vault,
      approve: async () => (asked = true),
    });
    const joining = joinPairing(b, { code: 'K7M4QX92Q', identity: createIdentity('B', 'desktop') });
    await Promise.all([
      expect(joining).rejects.toMatchObject({ code: 'wrong-code' }),
      expect(hosting).rejects.toMatchObject({ code: 'wrong-code' }),
    ]);
    expect(asked).toBe(false);
  });

  it('lets the user decline a device', async () => {
    const [a, b] = bytePair();
    const code = pairingCode();
    const hosting = hostPairing(a, { code, identity: createIdentity('A', 'desktop'), vault, approve: async () => false });
    const joining = joinPairing(b, { code, identity: createIdentity('B', 'web') });
    await Promise.all([
      expect(joining).rejects.toMatchObject({ code: 'declined' }),
      expect(hosting).rejects.toMatchObject({ code: 'declined' }),
    ]);
  });

  it('shows nothing of the code, the names or the notes to whoever watches the wire', async () => {
    const wire = tappedPair();
    const code = pairingCode();
    const hosting = hostPairing(wire.left, {
      code,
      identity: createIdentity('PC portable', 'desktop'),
      vault,
      approve: async () => true,
    });
    const joined = await joinPairing(wire.right, { code, identity: createIdentity('PC fixe', 'desktop') });
    const hosted = await hosting;
    const received: SyncMessage[] = [];
    joined.channel.onMessage((m) => received.push(m));
    hosted.channel.send({ type: 'blob', hash: 'h', data: new TextEncoder().encode('Journal intime') });
    await vi.waitFor(() => expect(received).toHaveLength(1));
    for (const secret of [code, formatCode(code), 'PC portable', 'PC fixe', 'Mes notes', 'coffre-1', 'Journal intime']) {
      expect(seen(wire.frames, secret), secret).toBe(false);
    }
  });

  it('stops when a frame is altered on the way', async () => {
    // Frames: pair, pair-proof, pair-proof, then the guest's device, encrypted.
    const wire = tappedPair((frame, index) => (index === 3 ? frame.map((b, i) => (i === 0 ? b ^ 1 : b)) : frame));
    const code = pairingCode();
    const hosting = hostPairing(wire.left, { code, identity: createIdentity('A', 'desktop'), vault, approve: async () => true });
    const joining = joinPairing(wire.right, { code, identity: createIdentity('B', 'desktop') });
    await Promise.all([
      expect(hosting).rejects.toMatchObject({ code: 'bad-proof' }),
      expect(joining).rejects.toMatchObject({ code: 'closed' }),
    ]);
  });
});
