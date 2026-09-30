import { fromBase64, FrameCipher, utf8 } from './crypto';
import { decodeMessage, encodeMessage, type SyncChannel, type SyncMessage } from './protocol';

/** A link carrying frames of bytes, whatever the transport (memory, TCP, WebRTC). */
export interface ByteChannel {
  send(frame: Uint8Array): void;
  onMessage(listener: (frame: Uint8Array) => void): () => void;
  onClose(listener: () => void): () => void;
  close(): void;
}

export type RefusalCode =
  'closed' | 'timeout' | 'protocol' | 'wrong-vault' | 'unknown-device' | 'removed' | 'bad-proof' | 'wrong-code' | 'declined';

/** Why a link to another device could not be made; the app turns the code into a sentence. */
export class SyncRefusal extends Error {
  constructor(readonly code: RefusalCode) {
    super(`cobblestone:sync-${code}`);
  }
}

/** Two byte channels joined in memory, delivering later as a real wire does. */
export function bytePair(): [ByteChannel, ByteChannel] {
  const make = () => ({ listeners: new Set<(f: Uint8Array) => void>(), closers: new Set<() => void>(), closed: false });
  const a = make();
  const b = make();
  const side = (self: ReturnType<typeof make>, other: ReturnType<typeof make>): ByteChannel => ({
    send(frame) {
      if (self.closed) return;
      const copy = frame.slice();
      queueMicrotask(() => !other.closed && [...other.listeners].forEach((l) => l(copy)));
    },
    onMessage(listener) {
      self.listeners.add(listener);
      return () => self.listeners.delete(listener);
    },
    onClose(listener) {
      self.closers.add(listener);
      return () => self.closers.delete(listener);
    },
    close() {
      if (self.closed) return;
      self.closed = true;
      self.closers.forEach((l) => l());
      // The other end hears of it after the frames already on their way, as over TCP.
      queueMicrotask(() => {
        if (other.closed) return;
        other.closed = true;
        other.closers.forEach((l) => l());
      });
    },
  });
  return [side(a, b), side(b, a)];
}

/** Frames read one at a time while a handshake runs; what arrives meanwhile waits in line. */
export class FrameReader {
  private queue: Uint8Array[] = [];
  private waiting: { resolve: (frame: Uint8Array) => void; reject: (error: Error) => void } | null = null;
  private isClosed = false;
  private readonly off: (() => void)[];

  constructor(raw: ByteChannel) {
    this.off = [
      raw.onMessage((frame) => {
        const waiting = this.waiting;
        this.waiting = null;
        if (waiting) waiting.resolve(frame);
        else this.queue.push(frame);
      }),
      raw.onClose(() => {
        this.isClosed = true;
        this.waiting?.reject(new SyncRefusal('closed'));
        this.waiting = null;
      }),
    ];
  }

  next(timeout = 15_000): Promise<Uint8Array> {
    const queued = this.queue.shift();
    if (queued) return Promise.resolve(queued);
    if (this.isClosed) return Promise.reject(new SyncRefusal('closed'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting = null;
        reject(new SyncRefusal('timeout'));
      }, timeout);
      this.waiting = {
        resolve: (frame) => {
          clearTimeout(timer);
          resolve(frame);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
    });
  }

  async nextJson<T extends { t: string }>(timeout?: number): Promise<T> {
    const frame = await this.next(timeout);
    try {
      const value = JSON.parse(new TextDecoder().decode(frame)) as T;
      if (typeof value?.t !== 'string') throw new Error();
      return value;
    } catch {
      throw new SyncRefusal('protocol');
    }
  }

  get closed(): boolean {
    return this.isClosed;
  }

  /** Stops reading; returns the frames that arrived and were not read. */
  release(): Uint8Array[] {
    this.off.forEach((off) => off());
    const rest = this.queue;
    this.queue = [];
    return rest;
  }
}

export function sendJson(raw: ByteChannel, value: { t: string } & Record<string, unknown>) {
  raw.send(utf8(JSON.stringify(value)));
}

/** Bytes sent as base64 by the other device, of the length expected. */
export function readBytes(text: unknown, length: number): Uint8Array {
  try {
    const bytes = fromBase64(text as string);
    if (bytes.length === length) return bytes;
  } catch {
    // Reported below.
  }
  throw new SyncRefusal('protocol');
}

/** An encrypted control message, before the link carries sync messages. */
export async function sealJson(raw: ByteChannel, cipher: FrameCipher, value: { t: string } & Record<string, unknown>) {
  raw.send(await cipher.seal(utf8(JSON.stringify(value))));
}

export async function openJson<T extends { t: string }>(cipher: FrameCipher, frame: Uint8Array): Promise<T> {
  let text: string;
  try {
    text = new TextDecoder().decode(await cipher.open(frame));
  } catch {
    throw new SyncRefusal('bad-proof');
  }
  try {
    const value = JSON.parse(text) as T;
    if (typeof value?.t === 'string') return value;
  } catch {
    // Reported below.
  }
  throw new SyncRefusal('protocol');
}

/** Sync messages as plain bytes (tests, and links that are already private). */
export function plainChannel(raw: ByteChannel): SyncChannel {
  return {
    send: (message) => raw.send(encodeMessage(message)),
    onMessage: (listener) => raw.onMessage((frame) => listener(decodeMessage(frame))),
    onClose: (listener) => raw.onClose(listener),
    close: () => raw.close(),
  };
}

/**
 * Sync messages over an encrypted link, once a session or a pairing has set
 * its keys. A frame that fails to open ends the link. Messages that arrive
 * before anyone listens wait for the first listener.
 */
export function secureChannel(
  raw: ByteChannel,
  ciphers: { send: FrameCipher; receive: FrameCipher },
  pending: Uint8Array[] = [],
): SyncChannel {
  const listeners = new Set<(message: SyncMessage) => void>();
  const early: SyncMessage[] = [];
  let outgoing: Promise<unknown> = Promise.resolve();
  let incoming: Promise<unknown> = Promise.resolve();

  const receive = (frame: Uint8Array) => {
    incoming = incoming
      .then(async () => {
        const message = decodeMessage(await ciphers.receive.open(frame));
        if (listeners.size) listeners.forEach((l) => l(message));
        else early.push(message);
      })
      .catch(() => raw.close());
  };
  pending.forEach(receive);
  raw.onMessage(receive);

  return {
    send(message) {
      outgoing = outgoing.then(async () => raw.send(await ciphers.send.seal(encodeMessage(message)))).catch(() => raw.close());
    },
    onMessage(listener) {
      listeners.add(listener);
      if (early.length) {
        const waiting = early.splice(0);
        queueMicrotask(() => waiting.forEach((m) => listeners.forEach((l) => l(m))));
      }
      return () => listeners.delete(listener);
    },
    onClose: (listener) => raw.onClose(listener),
    close: () => raw.close(),
  };
}
