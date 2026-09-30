import { ristretto255, ristretto255_hasher } from '@noble/curves/ed25519.js';
import {
  FrameReader,
  openJson,
  readBytes,
  sealJson,
  secureChannel,
  sendJson,
  SyncRefusal,
  type ByteChannel,
  type RefusalCode,
} from './channel';
import { deriveKeys, FrameCipher, hash, mac, randomBytes, sameBytes, toBase64, transcript } from './crypto';
import { publicInfo, readDevice, type DeviceIdentity, type DeviceInfo } from './identity';
import type { SyncChannel } from './protocol';

/*
 * Pairing a new device with a short code, shown on the device that has the
 * vault and typed on the other. The code never travels: both sides run CPace,
 * a password-authenticated key exchange (draft-irtf-cfrg-cpace) on
 * ristretto255, in which the code picks the group generator. Someone who
 * watches or relays the exchange learns nothing about the code; someone who
 * pretends to be a device gets one guess per attempt. Once both prove they
 * used the same code, the rest is encrypted: the new device gives its public
 * key, the user accepts it, and the vault starts to flow on the same link.
 *
 *   guest → pair        { sid, y }
 *   host  → pair-proof  { y, proof }
 *   guest → pair-proof  { proof }          (or refused { code: wrong-code })
 *   guest → [device]    { device }         encrypted from here
 *   host  → [accepted]  { host, vault }    (or [declined])
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 9;
const CONTEXT = 'cobblestone pairing 1';
const LABELS = ['guest to host', 'host to guest', 'guest proof', 'host proof'];

/** A new pairing code: nine symbols (45 bits), without letters that look like digits. */
export function pairingCode(): string {
  return [...randomBytes(CODE_LENGTH)].map((b) => ALPHABET[b & 31]).join('');
}

/** "K7M4QX92P" → "K7M 4QX 92P". */
export function formatCode(code: string): string {
  return code.match(/.{1,3}/g)?.join(' ') ?? code;
}

/** What someone typed, as a code (case, spaces and dashes aside; O reads 0, I and L read 1), or null. */
export function readCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

export interface VaultTicket {
  /** Sync id of the vault. */
  id: string;
  name: string;
}

export interface HostOptions {
  code: string;
  identity: DeviceIdentity;
  vault: VaultTicket;
  /** Asks the user whether this device may join; false declines it. */
  approve(device: DeviceInfo): Promise<boolean>;
  timeout?: number;
}

export interface GuestOptions {
  code: string;
  identity: DeviceIdentity;
  timeout?: number;
  /** How long to wait for the user of the other device to accept. */
  approvalTimeout?: number;
  /** Called once both sides proved the same code, before the other device's user decides. */
  onProven?: () => void;
}

type Point = InstanceType<typeof ristretto255.Point>;

function generator(code: string, sid: Uint8Array): Point {
  return ristretto255_hasher.hashToCurve(transcript(CONTEXT, code, sid), { DST: 'cobblestone-cpace-ristretto255' });
}

function secretScalar(): bigint {
  for (;;) {
    const scalar = ristretto255_hasher.hashToScalar(randomBytes(64), { DST: 'cobblestone-cpace-scalar' });
    if (scalar !== 0n) return scalar;
  }
}

function readPoint(text: unknown): Point {
  try {
    const point = ristretto255.Point.fromBytes(readBytes(text, 32));
    if (!point.is0()) return point;
  } catch {
    // Reported below.
  }
  throw new SyncRefusal('protocol');
}

function pairingKeys(shared: Point, th: Uint8Array) {
  const [toHost, toGuest, guestProof, hostProof] = deriveKeys(shared.toBytes(), th, LABELS);
  return { toHost: toHost!, toGuest: toGuest!, guestProof: guestProof!, hostProof: hostProof! };
}

/** Joins a vault from the device that shows the code. */
export async function joinPairing(
  raw: ByteChannel,
  options: GuestOptions,
): Promise<{ host: DeviceInfo; vault: VaultTicket; channel: SyncChannel }> {
  const reader = new FrameReader(raw);
  try {
    const sid = randomBytes(16);
    const scalar = secretScalar();
    const own = generator(options.code, sid).multiply(scalar).toBytes();
    sendJson(raw, { t: 'pair', v: 1, sid: toBase64(sid), y: toBase64(own) });

    const reply = await reader.nextJson<{ t: string; y?: string; proof?: string; code?: RefusalCode }>(options.timeout);
    if (reply.t !== 'pair-proof') throw new SyncRefusal('protocol');
    const theirs = readPoint(reply.y);
    const th = hash(transcript(CONTEXT, sid, own, theirs.toBytes()));
    const keys = pairingKeys(theirs.multiply(scalar), th);
    if (!sameBytes(mac(keys.hostProof, th), readBytes(reply.proof, 32))) {
      sendJson(raw, { t: 'refused', code: 'wrong-code' });
      throw new SyncRefusal('wrong-code');
    }
    sendJson(raw, { t: 'pair-proof', proof: toBase64(mac(keys.guestProof, th)) });
    options.onProven?.();

    const ciphers = { send: new FrameCipher(keys.toHost), receive: new FrameCipher(keys.toGuest) };
    await sealJson(raw, ciphers.send, { t: 'device', device: publicInfo(options.identity) });
    const answer = await openJson<{ t: string; host?: unknown; vault?: Partial<VaultTicket> }>(
      ciphers.receive,
      await reader.next(options.approvalTimeout ?? 180_000),
    );
    if (answer.t === 'declined') throw new SyncRefusal('declined');
    if (answer.t !== 'accepted' || typeof answer.vault?.id !== 'string' || typeof answer.vault.name !== 'string') {
      throw new SyncRefusal('protocol');
    }
    const host = readDevice(answer.host);
    const vault = { id: answer.vault.id, name: answer.vault.name };
    return { host, vault, channel: secureChannel(raw, ciphers, reader.release()) };
  } catch (error) {
    reader.release();
    raw.close();
    throw error;
  }
}

/** Welcomes a device that typed the code this device shows. */
export async function hostPairing(raw: ByteChannel, options: HostOptions): Promise<{ device: DeviceInfo; channel: SyncChannel }> {
  const reader = new FrameReader(raw);
  try {
    const hello = await reader.nextJson<{ t: string; v?: number; sid?: string; y?: string }>(options.timeout);
    if (hello.t !== 'pair' || hello.v !== 1) throw new SyncRefusal('protocol');
    const sid = readBytes(hello.sid, 16);
    const theirs = readPoint(hello.y);
    const scalar = secretScalar();
    const own = generator(options.code, sid).multiply(scalar).toBytes();
    const th = hash(transcript(CONTEXT, sid, theirs.toBytes(), own));
    const keys = pairingKeys(theirs.multiply(scalar), th);
    sendJson(raw, { t: 'pair-proof', y: toBase64(own), proof: toBase64(mac(keys.hostProof, th)) });

    const confirm = await reader.nextJson<{ t: string; proof?: string }>(options.timeout);
    if (confirm.t !== 'pair-proof' || !sameBytes(mac(keys.guestProof, th), readBytes(confirm.proof, 32))) {
      throw new SyncRefusal('wrong-code');
    }

    const ciphers = { send: new FrameCipher(keys.toGuest), receive: new FrameCipher(keys.toHost) };
    const message = await openJson<{ t: string; device?: unknown }>(ciphers.receive, await reader.next(options.timeout));
    if (message.t !== 'device') throw new SyncRefusal('protocol');
    const device = readDevice(message.device);
    if (!(await options.approve(device))) {
      await sealJson(raw, ciphers.send, { t: 'declined' });
      throw new SyncRefusal('declined');
    }
    if (reader.closed) throw new SyncRefusal('closed');
    await sealJson(raw, ciphers.send, { t: 'accepted', host: publicInfo(options.identity), vault: options.vault });
    return { device, channel: secureChannel(raw, ciphers, reader.release()) };
  } catch (error) {
    reader.release();
    raw.close();
    throw error;
  }
}
