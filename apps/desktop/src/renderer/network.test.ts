import { describe, expect, it, vi } from 'vitest';
import type { DesktopBridge } from '../preload/index';
import { DesktopNetwork } from './network';

type Lan = DesktopBridge['lan'];

/** The main process's side, played by hand. */
function fakeLan() {
  const handlers: Record<string, (...args: never[]) => void> = {};
  const sent: [string, number[]][] = [];
  let nextId = 0;
  let connectReply: ((id: string) => void) | null = null;
  const lan = {
    start: vi.fn(async () => {}),
    listen: vi.fn(async () => {}),
    unlisten: vi.fn(async () => {}),
    search: vi.fn(async () => {}),
    connect: vi.fn(() => new Promise<string>((resolve) => (connectReply = resolve))),
    send: (id: string, frame: Uint8Array) => void sent.push([id, [...frame]]),
    close: vi.fn(async () => {}),
    onFound: (l: never) => ((handlers.found = l), () => {}),
    onIncoming: (l: never) => ((handlers.incoming = l), () => {}),
    onFrame: (l: never) => ((handlers.frame = l), () => {}),
    onClosed: (l: never) => ((handlers.closed = l), () => {}),
  } as unknown as Lan;
  const emit = (name: string, ...args: unknown[]) => (handlers[name] as (...a: unknown[]) => void)(...args);
  return { lan, emit, sent, reply: (id = `lien-${++nextId}`) => (connectReply!(id), id) };
}

describe('DesktopNetwork', () => {
  it('keeps the frames that arrive before the window knows their link', async () => {
    const main = fakeLan();
    const network = new DesktopNetwork(main.lan, '0123456789abcdef');
    const connecting = network.connect('192.168.1.2:4000', 'vault-x');
    await Promise.resolve();
    // The other device answers before the link's id reaches the window.
    main.emit('frame', 'lien-1', new Uint8Array([7]));
    main.reply('lien-1');
    const link = await connecting;
    const heard: number[][] = [];
    link.onMessage((f) => heard.push([...f]));
    main.emit('frame', 'lien-1', new Uint8Array([8]));
    expect(heard).toEqual([[7], [8]]);

    link.send(new Uint8Array([9]));
    expect(main.sent).toEqual([['lien-1', [9]]]);
    let closed = false;
    link.onClose(() => (closed = true));
    main.emit('closed', 'lien-1');
    expect(closed).toBe(true);
  });

  it('hands incoming links to the sync, and counts who listens for a tag', async () => {
    const main = fakeLan();
    const network = new DesktopNetwork(main.lan, '0123456789abcdef');
    const tags: string[] = [];
    network.onIncoming((link, tag) => {
      tags.push(tag);
      link.onMessage(() => tags.push('frame'));
    });
    main.emit('incoming', 'lien-9', 'vault-x');
    main.emit('frame', 'lien-9', new Uint8Array([1]));
    expect(tags).toEqual(['vault-x', 'frame']);

    const stopA = network.listen('vault-x');
    const stopB = network.listen('vault-x');
    await vi.waitFor(() => expect(main.lan.listen).toHaveBeenCalledTimes(1));
    stopA();
    stopA();
    await Promise.resolve();
    expect(main.lan.unlisten).not.toHaveBeenCalled();
    stopB();
    await vi.waitFor(() => expect(main.lan.unlisten).toHaveBeenCalledWith('vault-x'));
  });
});
