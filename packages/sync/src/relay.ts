import type { ByteChannel } from './channel';
import type { Network } from './network';

/*
 * A relay on the Internet (apps/relay), reached by WebSocket from a browser,
 * Electron or Node. Devices meet there by tag and get links; the relay only
 * passes frames, encrypted end to end by the sessions. The connection comes
 * back by itself after a cut, and re-announces what this device listens for.
 */

class RelayLink implements ByteChannel {
  private readonly listeners = new Set<(frame: Uint8Array) => void>();
  private readonly closers = new Set<() => void>();
  private waiting: Uint8Array[] = [];
  private closed = false;

  constructor(
    private readonly relay: RelayNetwork,
    readonly id: number,
  ) {}

  receive(frame: Uint8Array) {
    if (this.listeners.size) [...this.listeners].forEach((l) => l(frame));
    else this.waiting.push(frame);
  }

  ended() {
    if (this.closed) return;
    this.closed = true;
    this.closers.forEach((l) => l());
  }

  send(frame: Uint8Array) {
    if (!this.closed) this.relay.sendFrame(this.id, frame);
  }

  onMessage(listener: (frame: Uint8Array) => void) {
    this.listeners.add(listener);
    const waiting = this.waiting;
    this.waiting = [];
    waiting.forEach((frame) => listener(frame));
    return () => void this.listeners.delete(listener);
  }

  onClose(listener: () => void) {
    this.closers.add(listener);
    return () => void this.closers.delete(listener);
  }

  close() {
    if (this.closed) return;
    this.relay.closeLink(this.id);
    this.ended();
  }
}

export class RelayNetwork implements Network {
  private socket: WebSocket | null = null;
  private readonly listens = new Map<string, number>();
  private readonly watches = new Map<string, number>();
  private readonly links = new Map<number, RelayLink>();
  private readonly pending = new Map<number, { tag: string; resolve: (link: RelayLink) => void; reject: (e: Error) => void }>();
  private readonly found = new Set<(tag: string, address: string, device: string) => void>();
  private readonly incoming = new Set<(link: ByteChannel, tag: string) => void>();
  private request = 0;
  private retry = 1_000;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private stopped = false;
  private openWaiters: (() => void)[] = [];

  constructor(
    readonly url: string,
    private readonly device: string,
  ) {
    this.open();
    // Devices come and go: ask again now and then (the relay answers with those it knows).
    const every = setInterval(() => this.search(), 15_000);
    this.timers.push(every as unknown as ReturnType<typeof setTimeout>);
  }

  private open() {
    if (this.stopped) return;
    const socket = new WebSocket(this.url);
    socket.binaryType = 'arraybuffer';
    this.socket = socket;
    socket.onopen = () => {
      this.retry = 1_000;
      this.text({ t: 'hello', device: this.device });
      for (const tag of this.listens.keys()) this.text({ t: 'listen', tag });
      for (const tag of this.watches.keys()) this.text({ t: 'watch', tag });
      this.openWaiters.splice(0).forEach((resolve) => resolve());
    };
    socket.onmessage = (event) => {
      if (typeof event.data === 'string') return this.onText(event.data);
      const data = new Uint8Array(event.data as ArrayBuffer);
      if (data.length < 4) return;
      const id = new DataView(data.buffer, data.byteOffset).getUint32(0);
      this.links.get(id)?.receive(data.slice(4));
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      for (const link of [...this.links.values()]) link.ended();
      this.links.clear();
      for (const waiting of this.pending.values()) waiting.reject(new Error('Relay connection lost'));
      this.pending.clear();
      if (this.stopped) return;
      this.timers.push(setTimeout(() => this.open(), this.retry));
      this.retry = Math.min(this.retry * 2, 30_000);
    };
    socket.onerror = () => socket.close();
  }

  private onText(data: string) {
    let message: { t?: string; tag?: string; address?: string; device?: string; req?: number; link?: number };
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }
    switch (message.t) {
      case 'found':
        if (message.tag && message.address && message.device) {
          this.found.forEach((l) => l(message.tag!, message.address!, message.device!));
        }
        return;
      case 'linked': {
        const waiting = this.pending.get(message.req!);
        this.pending.delete(message.req!);
        if (!waiting) return;
        const link = new RelayLink(this, message.link!);
        this.links.set(link.id, link);
        link.onClose(() => this.links.delete(link.id));
        waiting.resolve(link);
        return;
      }
      case 'refused':
        this.pending.get(message.req!)?.reject(new Error('Refused by the relay'));
        this.pending.delete(message.req!);
        return;
      case 'incoming': {
        const link = new RelayLink(this, message.link!);
        this.links.set(link.id, link);
        link.onClose(() => this.links.delete(link.id));
        if (!this.incoming.size || !this.listens.has(message.tag!)) return link.close();
        this.incoming.forEach((l) => l(link, message.tag!));
        return;
      }
      case 'closed':
        this.links.get(message.link!)?.ended();
        this.links.delete(message.link!);
        return;
    }
  }

  private text(message: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  sendFrame(link: number, frame: Uint8Array) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    const data = new Uint8Array(4 + frame.length);
    new DataView(data.buffer).setUint32(0, link);
    data.set(frame, 4);
    this.socket.send(data);
  }

  closeLink(link: number) {
    this.links.delete(link);
    this.text({ t: 'close', link });
  }

  private count(map: Map<string, number>, tag: string, kind: 'listen' | 'watch') {
    const n = (map.get(tag) ?? 0) + 1;
    map.set(tag, n);
    if (n === 1) this.text({ t: kind, tag });
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const left = (map.get(tag) ?? 1) - 1;
      if (left) return void map.set(tag, left);
      map.delete(tag);
      this.text({ t: kind === 'listen' ? 'unlisten' : 'unwatch', tag });
    };
  }

  listen(tag: string) {
    return this.count(this.listens, tag, 'listen');
  }

  watch(tag: string) {
    return this.count(this.watches, tag, 'watch');
  }

  onFound(listener: (tag: string, address: string, device: string) => void) {
    this.found.add(listener);
    return () => void this.found.delete(listener);
  }

  onIncoming(listener: (link: ByteChannel, tag: string) => void) {
    this.incoming.add(listener);
    return () => void this.incoming.delete(listener);
  }

  search() {
    this.text({ t: 'search' });
  }

  async connect(address: string, tag: string): Promise<ByteChannel> {
    if (!address.startsWith('relay:')) throw new Error(`Not a relay address: ${address}`);
    if (this.socket?.readyState !== WebSocket.OPEN) {
      await new Promise<void>((resolve, reject) => {
        this.openWaiters.push(resolve);
        this.timers.push(setTimeout(() => reject(new Error('Relay unreachable')), 10_000));
      });
    }
    const req = ++this.request;
    return new Promise((resolve, reject) => {
      this.pending.set(req, { tag, resolve, reject });
      this.text({ t: 'connect', req, to: Number(address.slice('relay:'.length)), tag });
    });
  }

  /** Leaves the relay for good. */
  close() {
    this.stopped = true;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.socket?.close();
  }
}

/**
 * Several networks as one (the local network and a relay): what this device
 * listens for is announced on each, and a network can come or go at any time.
 */
export class NetworkSet implements Network {
  private readonly members = new Map<Network, (() => void)[]>();
  private readonly listens = new Map<string, number>();
  private readonly watches = new Map<string, number>();
  private readonly found = new Set<(tag: string, address: string, device: string) => void>();
  private readonly incoming = new Set<(link: ByteChannel, tag: string) => void>();
  private readonly perTag = new Map<Network, Map<string, () => void>>();

  /** Addresses carry the network they came from. */
  private index = new Map<Network, number>();
  private byIndex = new Map<number, Network>();
  private next = 0;

  add(network: Network) {
    if (this.members.has(network)) return;
    const i = this.next++;
    this.index.set(network, i);
    this.byIndex.set(i, network);
    const tags = new Map<string, () => void>();
    this.perTag.set(network, tags);
    for (const tag of this.listens.keys()) tags.set(`l:${tag}`, network.listen(tag));
    for (const tag of this.watches.keys()) tags.set(`w:${tag}`, network.watch?.(tag) ?? (() => {}));
    this.members.set(network, [
      network.onFound((tag, address, device) => this.found.forEach((l) => l(tag, `${i}|${address}`, device))),
      network.onIncoming((link, tag) => this.incoming.forEach((l) => l(link, tag))),
    ]);
    network.search();
  }

  remove(network: Network) {
    this.members.get(network)?.forEach((off) => off());
    this.perTag.get(network)?.forEach((off) => off());
    this.members.delete(network);
    this.perTag.delete(network);
    const i = this.index.get(network);
    this.index.delete(network);
    if (i !== undefined) this.byIndex.delete(i);
  }

  has(network: Network) {
    return this.members.has(network);
  }

  private track(map: Map<string, number>, tag: string, prefix: 'l' | 'w') {
    const n = (map.get(tag) ?? 0) + 1;
    map.set(tag, n);
    if (n === 1) {
      for (const [network, tags] of this.perTag) {
        tags.set(`${prefix}:${tag}`, prefix === 'l' ? network.listen(tag) : (network.watch?.(tag) ?? (() => {})));
      }
    }
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const left = (map.get(tag) ?? 1) - 1;
      if (left) return void map.set(tag, left);
      map.delete(tag);
      for (const tags of this.perTag.values()) {
        tags.get(`${prefix}:${tag}`)?.();
        tags.delete(`${prefix}:${tag}`);
      }
    };
  }

  listen(tag: string) {
    return this.track(this.listens, tag, 'l');
  }

  watch(tag: string) {
    return this.track(this.watches, tag, 'w');
  }

  onFound(listener: (tag: string, address: string, device: string) => void) {
    this.found.add(listener);
    return () => void this.found.delete(listener);
  }

  onIncoming(listener: (link: ByteChannel, tag: string) => void) {
    this.incoming.add(listener);
    return () => void this.incoming.delete(listener);
  }

  search() {
    for (const network of this.members.keys()) network.search();
  }

  connect(address: string, tag: string): Promise<ByteChannel> {
    const bar = address.indexOf('|');
    const network = this.byIndex.get(Number(address.slice(0, bar)));
    if (!network) return Promise.reject(new Error(`No network for ${address}`));
    return network.connect(address.slice(bar + 1), tag);
  }
}
