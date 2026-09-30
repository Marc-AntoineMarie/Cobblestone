import { x25519 } from '@noble/curves/ed25519.js';
import { concatBytes } from '@noble/hashes/utils.js';
import { FrameReader, readBytes, secureChannel, sendJson, SyncRefusal, type ByteChannel, type RefusalCode } from './channel';
import { deriveKeys, FrameCipher, fromBase64, hash, mac, sameBytes, toBase64, transcript } from './crypto';
import { deviceIdOf, type DeviceIdentity } from './identity';
import type { SyncChannel } from './protocol';

/*
 * A session between two devices already paired for a vault: a "3DH" key
 * agreement, as in Signal's X3DH. Each side brings its long-term key and a
 * fresh one; the session keys depend on all four, so only the two devices
 * named can read the session, and a recorded session stays unreadable if a
 * device key leaks later. Each side proves its key before any data flows.
 *
 *   initiator → hello    { vault, key, e }
 *   responder → welcome  { key, e, proof }   (or refused { code })
 *   initiator → confirm  { proof }
 */

export interface SessionOptions {
  identity: DeviceIdentity;
  /** Sync id of the vault. */
  vault: string;
  /** Whether a device may join this vault's sessions: paired, and not removed. */
  trusts(deviceId: string, publicKey: string): boolean;
  /** Whether a device was removed from the vault: it is told so, to stop trying. */
  removed?(deviceId: string): boolean;
  timeout?: number;
}

export interface Session {
  /** Id of the other device. */
  peer: string;
  channel: SyncChannel;
}

interface Hello {
  t: 'hello';
  v: number;
  vault: string;
  key: string;
  e: string;
}
interface Welcome {
  t: 'welcome';
  key: string;
  e: string;
  proof: string;
}
interface Confirm {
  t: 'confirm';
  proof: string;
}
interface Refused {
  t: 'refused';
  code: RefusalCode;
}

const LABELS = ['initiator to responder', 'responder to initiator', 'initiator proof', 'responder proof'];
const CONTEXT = 'cobblestone session 1';
const REFUSALS: RefusalCode[] = ['wrong-vault', 'unknown-device', 'removed'];

function sessionKeys(shared: Uint8Array[], th: Uint8Array) {
  const [toResponder, toInitiator, initiatorProof, responderProof] = deriveKeys(concatBytes(...shared), th, LABELS);
  return {
    toResponder: toResponder!,
    toInitiator: toInitiator!,
    initiatorProof: initiatorProof!,
    responderProof: responderProof!,
  };
}

/** Opens a session with a device that listens (this device made the connection). */
export async function openSession(raw: ByteChannel, options: SessionOptions): Promise<Session> {
  const reader = new FrameReader(raw);
  try {
    const own = fromBase64(options.identity.publicKey);
    const secret = fromBase64(options.identity.secretKey);
    const fresh = x25519.keygen();
    sendJson(raw, { t: 'hello', v: 1, vault: options.vault, key: options.identity.publicKey, e: toBase64(fresh.publicKey) });

    const reply = await reader.nextJson<Welcome | Refused>(options.timeout);
    if (reply.t === 'refused') throw new SyncRefusal(REFUSALS.includes(reply.code) ? reply.code : 'protocol');
    if (reply.t !== 'welcome') throw new SyncRefusal('protocol');
    const peerKey = readBytes(reply.key, 32);
    const peerFresh = readBytes(reply.e, 32);
    const peer = deviceIdOf(peerKey);
    if (!options.trusts(peer, reply.key)) throw new SyncRefusal('unknown-device');

    const th = hash(transcript(CONTEXT, options.vault, own, fresh.publicKey, peerKey, peerFresh));
    const keys = sessionKeys(
      [
        x25519.getSharedSecret(fresh.secretKey, peerFresh),
        x25519.getSharedSecret(secret, peerFresh),
        x25519.getSharedSecret(fresh.secretKey, peerKey),
      ],
      th,
    );
    if (!sameBytes(mac(keys.responderProof, th), readBytes(reply.proof, 32))) throw new SyncRefusal('bad-proof');
    sendJson(raw, { t: 'confirm', proof: toBase64(mac(keys.initiatorProof, th)) });
    const ciphers = { send: new FrameCipher(keys.toResponder), receive: new FrameCipher(keys.toInitiator) };
    return { peer, channel: secureChannel(raw, ciphers, reader.release()) };
  } catch (error) {
    reader.release();
    raw.close();
    throw error;
  }
}

/** Answers a device that connected to this one. */
export async function acceptSession(raw: ByteChannel, options: SessionOptions): Promise<Session> {
  const reader = new FrameReader(raw);
  const refuse = (code: RefusalCode) => {
    sendJson(raw, { t: 'refused', code });
    return new SyncRefusal(code);
  };
  try {
    const hello = await reader.nextJson<Hello>(options.timeout);
    if (hello.t !== 'hello' || hello.v !== 1) throw new SyncRefusal('protocol');
    if (hello.vault !== options.vault) throw refuse('wrong-vault');
    const peerKey = readBytes(hello.key, 32);
    const peerFresh = readBytes(hello.e, 32);
    const peer = deviceIdOf(peerKey);
    if (options.removed?.(peer)) throw refuse('removed');
    if (!options.trusts(peer, hello.key)) throw refuse('unknown-device');

    const own = fromBase64(options.identity.publicKey);
    const secret = fromBase64(options.identity.secretKey);
    const fresh = x25519.keygen();
    const th = hash(transcript(CONTEXT, options.vault, peerKey, peerFresh, own, fresh.publicKey));
    const keys = sessionKeys(
      [
        x25519.getSharedSecret(fresh.secretKey, peerFresh),
        x25519.getSharedSecret(fresh.secretKey, peerKey),
        x25519.getSharedSecret(secret, peerFresh),
      ],
      th,
    );
    sendJson(raw, {
      t: 'welcome',
      key: options.identity.publicKey,
      e: toBase64(fresh.publicKey),
      proof: toBase64(mac(keys.responderProof, th)),
    });

    const confirm = await reader.nextJson<Confirm>(options.timeout);
    if (confirm.t !== 'confirm' || !sameBytes(mac(keys.initiatorProof, th), readBytes(confirm.proof, 32))) {
      throw new SyncRefusal('bad-proof');
    }
    const ciphers = { send: new FrameCipher(keys.toInitiator), receive: new FrameCipher(keys.toResponder) };
    return { peer, channel: secureChannel(raw, ciphers, reader.release()) };
  } catch (error) {
    reader.release();
    raw.close();
    throw error;
  }
}
