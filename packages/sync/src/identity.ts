import { x25519 } from '@noble/curves/ed25519.js';
import { bytesToHex, fromBase64, hash, toBase64 } from './crypto';
import { SyncRefusal } from './channel';

/*
 * Each device has a key pair of its own (X25519). Its public half, with a name,
 * is what other devices of a vault know it by; its secret half stays in the
 * device's own storage, never in the vault, so a copied vault folder carries
 * no secret.
 */

export type DeviceKind = 'desktop' | 'web' | 'phone';

export interface DeviceInfo {
  /** Derived from the public key: a device cannot claim another's id. */
  id: string;
  name: string;
  kind: DeviceKind;
  publicKey: string;
}

export interface DeviceIdentity extends DeviceInfo {
  secretKey: string;
}

export function deviceIdOf(publicKey: Uint8Array): string {
  return bytesToHex(hash(publicKey)).slice(0, 16);
}

export function createIdentity(name: string, kind: DeviceKind): DeviceIdentity {
  const { secretKey, publicKey } = x25519.keygen();
  return { id: deviceIdOf(publicKey), name, kind, publicKey: toBase64(publicKey), secretKey: toBase64(secretKey) };
}

export function publicInfo({ id, name, kind, publicKey }: DeviceInfo): DeviceInfo {
  return { id, name, kind, publicKey };
}

/** A device described by another device: checked field by field, id included. */
export function readDevice(value: unknown): DeviceInfo {
  const device = value as Partial<DeviceInfo> | null;
  const kinds: DeviceKind[] = ['desktop', 'web', 'phone'];
  const valid =
    typeof device?.name === 'string' &&
    device.name.length > 0 &&
    device.name.length <= 80 &&
    kinds.includes(device.kind as DeviceKind) &&
    typeof device.publicKey === 'string' &&
    typeof device.id === 'string';
  if (!valid) throw new SyncRefusal('protocol');
  let key: Uint8Array;
  try {
    key = fromBase64(device.publicKey!);
  } catch {
    throw new SyncRefusal('protocol');
  }
  if (key.length !== 32 || deviceIdOf(key) !== device.id) throw new SyncRefusal('protocol');
  return publicInfo(device as DeviceInfo);
}
