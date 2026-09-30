import type { ByteChannel, Network } from '@cobblestone/sync';
import type { DesktopBridge } from '../preload/index';

/*
 * The local network, reached through the main process (see main/lan.ts).
 * Frames may arrive before the window knows their link (a link it just made,
 * whose id is still on its way): they wait for it.
 */

type Lan = DesktopBridge['lan'];

class BridgeLink implements ByteChannel {
  private readonly listeners = new Set<(frame: Uint8Array) => void>();
  private readonly closers = new Set<() => void>();
  private waiting: Uint8Array[] = [];
  private closed = false;

  constructor(
    private readonly lan: Lan,
    private readonly id: string,
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
    if (!this.closed) this.lan.send(this.id, frame);
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
    void this.lan.close(this.id);
    this.ended();
  }
}

export class DesktopNetwork implements Network {
  private readonly links = new Map<string, BridgeLink>();
  private readonly early = new Map<string, { frames: Uint8Array[]; closed: boolean }>();
  private readonly listens = new Map<string, number>();
  private readonly found = new Set<(tag: string, address: string, device: string) => void>();
  private readonly incoming = new Set<(link: ByteChannel, tag: string) => void>();
  private readonly ready: Promise<void>;

  constructor(
    private readonly lan: Lan,
    device: string,
  ) {
    const early = (id: string) => {
      let entry = this.early.get(id);
      if (!entry) this.early.set(id, (entry = { frames: [], closed: false }));
      return entry;
    };
    lan.onFrame((id, frame) => {
      const link = this.links.get(id);
      if (link) link.receive(frame);
      else early(id).frames.push(frame);
    });
    lan.onClosed((id) => {
      const link = this.links.get(id);
      if (link) link.ended();
      else early(id).closed = true;
    });
    lan.onFound((tag, address, from) => this.found.forEach((l) => l(tag, address, from)));
    lan.onIncoming((id, tag) => {
      const link = this.link(id);
      if (this.incoming.size === 0) return link.close();
      this.incoming.forEach((l) => l(link, tag));
    });
    this.ready = lan.start(device);
    this.ready.catch(() => {});
  }

  private link(id: string): BridgeLink {
    const link = new BridgeLink(this.lan, id);
    this.links.set(id, link);
    link.onClose(() => this.links.delete(id));
    const early = this.early.get(id);
    if (early) {
      this.early.delete(id);
      early.frames.forEach((frame) => link.receive(frame));
      if (early.closed) link.ended();
    }
    return link;
  }

  listen(tag: string): () => void {
    const count = (this.listens.get(tag) ?? 0) + 1;
    this.listens.set(tag, count);
    if (count === 1) void this.ready.then(() => this.lan.listen(tag));
    let listening = true;
    return () => {
      if (!listening) return;
      listening = false;
      const left = (this.listens.get(tag) ?? 1) - 1;
      if (left) return void this.listens.set(tag, left);
      this.listens.delete(tag);
      void this.ready.then(() => this.lan.unlisten(tag));
    };
  }

  onFound(listener: (tag: string, address: string, device: string) => void) {
    this.found.add(listener);
    return () => void this.found.delete(listener);
  }

  onIncoming(listener: (link: ByteChannel, tag: string) => void) {
    this.incoming.add(listener);
    return () => void this.incoming.delete(listener);
  }

  async connect(address: string, tag: string): Promise<ByteChannel> {
    await this.ready;
    return this.link(await this.lan.connect(address, tag));
  }

  search() {
    void this.ready.then(() => this.lan.search());
  }
}
