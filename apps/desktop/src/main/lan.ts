import dgram from 'node:dgram';
import net from 'node:net';

/*
 * The local network, without any server. Each app announces itself by UDP
 * multicast every few seconds, with its device id and the tags it listens for
 * (a vault, or a pairing in progress); links are TCP connections carrying
 * frames (four bytes of length, then the bytes). The first frame of a link
 * names the tag it comes for. Frames are encrypted in the renderer before
 * they get here: this module only moves bytes, and bounds what a stranger on
 * the network can make it do.
 */

export interface LanOptions {
  /** Multicast group and port of the announcements. */
  group?: string;
  port?: number;
  /** Milliseconds between two announcements. */
  interval?: number;
  maxFrame?: number;
  maxLinks?: number;
}

export interface LanLink {
  send(frame: Uint8Array): void;
  onFrame(listener: (frame: Uint8Array) => void): () => void;
  onClose(listener: () => void): () => void;
  close(): void;
}

const DEFAULTS = { group: '239.255.42.99', port: 47_700, interval: 5_000, maxFrame: 256 * 1024 * 1024, maxLinks: 64 };

/** A TCP socket cut into frames. Frames that arrive before anyone listens wait. */
class FramedSocket implements LanLink {
  private chunks: Buffer[] = [];
  private size = 0;
  private need = -1;
  private readonly listeners = new Set<(frame: Uint8Array) => void>();
  private readonly closers = new Set<() => void>();
  private waiting: Uint8Array[] = [];
  closed = false;

  constructor(
    private readonly socket: net.Socket,
    private readonly maxFrame: number,
  ) {
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 10_000);
    socket.on('data', (chunk: Buffer) => this.receive(chunk));
    socket.on('error', () => socket.destroy());
    socket.on('close', () => this.ended());
  }

  private take(length: number): Buffer {
    const all = this.chunks.length === 1 ? this.chunks[0]! : Buffer.concat(this.chunks, this.size);
    const rest = all.subarray(length);
    this.chunks = rest.length ? [rest] : [];
    this.size = rest.length;
    return all.subarray(0, length);
  }

  private receive(chunk: Buffer) {
    this.chunks.push(chunk);
    this.size += chunk.length;
    for (;;) {
      if (this.need < 0) {
        if (this.size < 4) return;
        this.need = this.take(4).readUInt32BE(0);
        if (this.need > this.maxFrame) return this.close();
      }
      if (this.size < this.need) return;
      const frame = Uint8Array.prototype.slice.call(this.take(this.need));
      this.need = -1;
      if (this.listeners.size) this.listeners.forEach((l) => l(frame));
      else this.waiting.push(frame);
    }
  }

  send(frame: Uint8Array) {
    if (this.closed) return;
    const head = Buffer.alloc(4);
    head.writeUInt32BE(frame.length);
    this.socket.cork();
    this.socket.write(head);
    this.socket.write(frame);
    this.socket.uncork();
  }

  onFrame(listener: (frame: Uint8Array) => void) {
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

  /** Ends the link once what was sent is written. */
  close() {
    if (this.closed) return;
    this.closed = true;
    this.socket.end();
    setTimeout(() => this.socket.destroy(), 2_000).unref();
  }

  private ended() {
    this.closed = true;
    this.closers.forEach((l) => l());
    this.closers.clear();
    this.listeners.clear();
  }
}

export class LanNetwork {
  /** Id of this device, announced with its tags. */
  device = '';
  private server: net.Server | null = null;
  private socket: dgram.Socket | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly options: typeof DEFAULTS;
  private readonly tags = new Map<string, number>();
  private readonly links = new Set<FramedSocket>();
  private readonly found = new Set<(tag: string, address: string, device: string) => void>();
  private readonly incoming = new Set<(link: LanLink, tag: string) => void>();

  constructor(options: LanOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  /** Port of the links, once started. */
  get port(): number {
    return (this.server?.address() as net.AddressInfo | null)?.port ?? 0;
  }

  async start(): Promise<void> {
    if (this.server) return;
    const server = net.createServer((socket) => this.welcome(socket));
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, () => resolve());
    });
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket = socket;
    socket.on('message', (data, from) => this.hear(data, from.address));
    // Without a network (or multicast), links can still be made by address.
    socket.on('error', () => {});
    await new Promise<void>((resolve) =>
      socket.bind(this.options.port, () => {
        try {
          socket.addMembership(this.options.group);
          socket.setMulticastLoopback(true);
        } catch {
          // No multicast here: nothing is found, links still work.
        }
        resolve();
      }),
    );
    this.timer = setInterval(() => this.announce(), this.options.interval);
    this.timer.unref();
    this.announce(true);
  }

  stop() {
    clearInterval(this.timer);
    this.links.forEach((l) => l.close());
    this.server?.close();
    this.socket?.close();
    this.server = null;
    this.socket = null;
  }

  listen(tag: string): () => void {
    this.tags.set(tag, (this.tags.get(tag) ?? 0) + 1);
    this.announce();
    let listening = true;
    return () => {
      if (!listening) return;
      listening = false;
      const left = (this.tags.get(tag) ?? 1) - 1;
      if (left) this.tags.set(tag, left);
      else this.tags.delete(tag);
      this.announce();
    };
  }

  onFound(listener: (tag: string, address: string, device: string) => void) {
    this.found.add(listener);
    return () => void this.found.delete(listener);
  }

  onIncoming(listener: (link: LanLink, tag: string) => void) {
    this.incoming.add(listener);
    return () => void this.incoming.delete(listener);
  }

  /** Asks the devices around to announce themselves now. */
  search() {
    this.announce(true);
  }

  async connect(address: string, tag: string): Promise<LanLink> {
    const colon = address.lastIndexOf(':');
    const host = address.slice(0, colon);
    const port = Number(address.slice(colon + 1));
    const socket = net.connect({ host, port });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`No answer from ${address}`));
      }, 5_000);
      socket.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    const link = this.track(new FramedSocket(socket, this.options.maxFrame));
    link.send(new TextEncoder().encode(tag));
    return link;
  }

  private track(link: FramedSocket): FramedSocket {
    this.links.add(link);
    link.onClose(() => this.links.delete(link));
    return link;
  }

  /** A link from another device: it must name a tag this device listens for, and quickly. */
  private welcome(socket: net.Socket) {
    if (this.links.size >= this.options.maxLinks) return socket.destroy();
    const link = this.track(new FramedSocket(socket, this.options.maxFrame));
    const timer = setTimeout(() => link.close(), 10_000);
    const off = link.onFrame((frame) => {
      off();
      clearTimeout(timer);
      const tag = frame.length <= 64 ? new TextDecoder().decode(frame) : '';
      if (!this.tags.has(tag) || this.incoming.size === 0) return link.close();
      this.incoming.forEach((l) => l(link, tag));
    });
  }

  private announce(query = false) {
    if (!this.socket || !this.device || !this.port) return;
    const message = JSON.stringify({
      app: 'cobblestone',
      v: 1,
      d: this.device,
      p: this.port,
      t: [...this.tags.keys()],
      ...(query ? { q: 1 } : {}),
    });
    this.socket.send(message, this.options.port, this.options.group, () => {});
  }

  private hear(data: Buffer, host: string) {
    let message: { app?: unknown; v?: unknown; d?: unknown; p?: unknown; t?: unknown; q?: unknown };
    try {
      message = JSON.parse(data.toString('utf8'));
    } catch {
      return;
    }
    const { d: device, p: port, t: tags } = message;
    if (message.app !== 'cobblestone' || message.v !== 1 || typeof device !== 'string' || device === this.device) return;
    if (!Number.isInteger(port) || !Array.isArray(tags)) return;
    if (message.q) this.announce();
    for (const tag of tags) {
      if (typeof tag === 'string' && tag.length <= 64) this.found.forEach((l) => l(tag, `${host}:${port as number}`, device));
    }
  }
}
