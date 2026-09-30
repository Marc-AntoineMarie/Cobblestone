import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, concatBytes, randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';

/*
 * Small cryptographic helpers shared by pairing and sessions. Hashes and key
 * derivation come from @noble/hashes (audited, synchronous); frames are sealed
 * with AES-256-GCM through Web Crypto, present in browsers, Electron and Node.
 */

export { bytesToHex, randomBytes };

export const utf8 = (text: string): Uint8Array => utf8ToBytes(text);

/** Joins fields with their lengths, so that no field can pass for the start of the next. */
export function transcript(...parts: (Uint8Array | string)[]): Uint8Array {
  return concatBytes(
    ...parts.flatMap((part) => {
      const bytes = typeof part === 'string' ? utf8(part) : part;
      const length = new Uint8Array(4);
      new DataView(length.buffer).setUint32(0, bytes.length);
      return [length, bytes];
    }),
  );
}

export const hash = (data: Uint8Array): Uint8Array => sha256(data);

export const mac = (key: Uint8Array, data: Uint8Array): Uint8Array => hmac(sha256, key, data);

/** Independent 32-byte keys from one secret, one per label. */
export function deriveKeys(secret: Uint8Array, salt: Uint8Array, labels: string[]): Uint8Array[] {
  return labels.map((label) => hkdf(sha256, secret, salt, utf8(label), 32));
}

/** Equality whose time does not depend on where the first difference is. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

/**
 * Seals the frames of one direction with AES-256-GCM. The nonce is a counter,
 * so a frame replayed, dropped or moved fails to open. Calls must not overlap.
 */
export class FrameCipher {
  private counter = 0;
  private readonly key: Promise<CryptoKey>;

  constructor(raw: Uint8Array) {
    this.key = crypto.subtle.importKey('raw', raw as Uint8Array<ArrayBuffer>, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  private nonce(): Uint8Array<ArrayBuffer> {
    const nonce = new Uint8Array(12);
    new DataView(nonce.buffer).setBigUint64(4, BigInt(this.counter++));
    return nonce;
  }

  async seal(data: Uint8Array): Promise<Uint8Array> {
    const iv = this.nonce();
    return new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.key, data as Uint8Array<ArrayBuffer>));
  }

  async open(data: Uint8Array): Promise<Uint8Array> {
    const iv = this.nonce();
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await this.key, data as Uint8Array<ArrayBuffer>));
  }
}
