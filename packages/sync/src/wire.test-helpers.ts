import { bytePair, type ByteChannel } from './channel';

/**
 * Two ends joined through a relay that records every frame, as a network or
 * a relay service would see them, and may alter or replay them.
 */
export function tappedPair(alter?: (frame: Uint8Array, index: number) => Uint8Array) {
  const [left, relayLeft] = bytePair();
  const [relayRight, right] = bytePair();
  const frames: Uint8Array[] = [];
  const pass = (to: ByteChannel) => (frame: Uint8Array) => {
    const index = frames.push(frame) - 1;
    to.send(alter ? alter(frame, index) : frame);
  };
  relayLeft.onMessage(pass(relayRight));
  relayRight.onMessage(pass(relayLeft));
  relayLeft.onClose(() => relayRight.close());
  relayRight.onClose(() => relayLeft.close());
  return { left, right, frames, replayToRight: (frame: Uint8Array) => relayRight.send(frame) };
}

/** Whether `needle` appears anywhere in the recorded frames. */
export function seen(frames: Uint8Array[], needle: string | Uint8Array): boolean {
  const bytes = typeof needle === 'string' ? new TextEncoder().encode(needle) : needle;
  return frames.some((frame) => {
    outer: for (let i = 0; i + bytes.length <= frame.length; i++) {
      for (let j = 0; j < bytes.length; j++) if (frame[i + j] !== bytes[j]) continue outer;
      return true;
    }
    return false;
  });
}
