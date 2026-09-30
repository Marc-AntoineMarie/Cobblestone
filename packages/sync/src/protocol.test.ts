import { describe, expect, it } from 'vitest';
import { channelPair, decodeMessage, encodeMessage, type SyncMessage } from './protocol';

describe('messages as bytes', () => {
  it('come back as they left', () => {
    const messages: SyncMessage[] = [
      { type: 'hello', stateVector: new Uint8Array([1, 2]) },
      { type: 'update', update: new Uint8Array([3, 4, 5]) },
      { type: 'blob-request', hash: 'ab'.repeat(32) },
      { type: 'blob', hash: 'cd'.repeat(32), data: new Uint8Array([6]) },
      { type: 'blob-missing', hash: 'ef'.repeat(32) },
    ];
    for (const message of messages) expect(decodeMessage(encodeMessage(message))).toEqual(message);
  });

  it('refuse an unknown type', () => {
    expect(() => decodeMessage(new Uint8Array([99, 0, 0]))).toThrow();
  });
});

describe('channelPair', () => {
  it('delivers later, one way and the other, until closed', async () => {
    const [left, right] = channelPair();
    const heard: string[] = [];
    right.onMessage((m) => heard.push(`droite ${m.type}`));
    left.onMessage((m) => heard.push(`gauche ${m.type}`));
    let closed = 0;
    right.onClose(() => closed++);
    left.send({ type: 'blob-missing', hash: 'x' });
    right.send({ type: 'blob-request', hash: 'y' });
    expect(heard).toEqual([]);
    await Promise.resolve();
    expect(heard).toEqual(['droite blob-missing', 'gauche blob-request']);
    left.close();
    left.send({ type: 'blob-missing', hash: 'z' });
    await Promise.resolve();
    expect(heard).toHaveLength(2);
    expect(closed).toBe(1);
  });
});
