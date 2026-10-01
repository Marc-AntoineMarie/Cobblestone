/*
 * What two devices say to each other. On connecting, each sends the state
 * vector of its vault; the other answers with what the first lacks, then every
 * change travels as an update. Attachments are asked for by hash.
 */

export type SyncMessage =
  | { type: 'hello'; stateVector: Uint8Array }
  | { type: 'update'; update: Uint8Array }
  | { type: 'blob-request'; hash: string }
  | { type: 'blob'; hash: string; data: Uint8Array }
  | { type: 'blob-missing'; hash: string }
  /** Where this device is (its cursor in a note): forgotten when it leaves. */
  | { type: 'presence'; data: Uint8Array }
  /** Between devices of one account: who they trust, which vaults they offer (JSON). */
  | { type: 'account'; data: Uint8Array };

/** A link to one other device, whatever carries it (memory, network, relay). */
export interface SyncChannel {
  send(message: SyncMessage): void;
  onMessage(listener: (message: SyncMessage) => void): () => void;
  onClose(listener: () => void): () => void;
  close(): void;
}

const TYPES = ['hello', 'update', 'blob-request', 'blob', 'blob-missing', 'presence', 'account'] as const;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * One message as bytes, for transports that carry bytes: its type, then the
 * length and bytes of its text field (a hash), then its binary payload.
 */
export function encodeMessage(message: SyncMessage): Uint8Array {
  const type = TYPES.indexOf(message.type);
  const label = encoder.encode('hash' in message ? message.hash : '');
  const payload =
    message.type === 'hello'
      ? message.stateVector
      : message.type === 'update'
        ? message.update
        : message.type === 'blob' || message.type === 'presence' || message.type === 'account'
          ? message.data
          : new Uint8Array();
  const out = new Uint8Array(1 + 2 + label.length + payload.length);
  out[0] = type;
  out[1] = label.length >> 8;
  out[2] = label.length & 0xff;
  out.set(label, 3);
  out.set(payload, 3 + label.length);
  return out;
}

export function decodeMessage(bytes: Uint8Array): SyncMessage {
  const type = TYPES[bytes[0]!];
  const labelLength = (bytes[1]! << 8) | bytes[2]!;
  const hash = decoder.decode(bytes.subarray(3, 3 + labelLength));
  const payload = bytes.slice(3 + labelLength);
  switch (type) {
    case 'hello':
      return { type, stateVector: payload };
    case 'update':
      return { type, update: payload };
    case 'blob-request':
      return { type, hash };
    case 'blob':
      return { type, hash, data: payload };
    case 'blob-missing':
      return { type, hash };
    case 'presence':
    case 'account':
      return { type, data: payload };
    default:
      throw new Error(`Unknown sync message ${bytes[0]}`);
  }
}

/** Two channels joined in memory, as two devices on one wire (tests, and one app talking to itself). */
export function channelPair(): [SyncChannel, SyncChannel] {
  const make = () => ({
    listeners: new Set<(m: SyncMessage) => void>(),
    closers: new Set<() => void>(),
    closed: false,
  });
  const a = make();
  const b = make();
  const side = (self: ReturnType<typeof make>, other: ReturnType<typeof make>): SyncChannel => ({
    send(message) {
      if (self.closed) return;
      // Through bytes, as on a real wire, and never synchronously.
      const bytes = encodeMessage(message);
      queueMicrotask(() => !other.closed && other.listeners.forEach((l) => l(decodeMessage(bytes))));
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
      for (const end of [self, other]) {
        if (end.closed) continue;
        end.closed = true;
        end.closers.forEach((l) => l());
      }
    },
  });
  return [side(a, b), side(b, a)];
}
