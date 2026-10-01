import { bytePair, type ByteChannel } from './channel';
import { bytesToHex, hash, utf8 } from './crypto';

/*
 * What a transport offers: devices announce the tags they listen for, others
 * find them and connect. A tag names what a device waits for: one of its
 * vaults (a hash of the vault's sync id, which reveals nothing of it) or a
 * pairing in progress. Links carry bytes only; everything on them is
 * encrypted before it leaves the app.
 */

export interface Network {
  /** Announces this device for a tag, until the returned function is called. */
  listen(tag: string): () => void;
  /** Devices that announce a tag; heard again at each announcement. */
  onFound(listener: (tag: string, address: string, device: string) => void): () => void;
  /** Links from devices that connected for one of this device's tags. */
  onIncoming(listener: (link: ByteChannel, tag: string) => void): () => void;
  connect(address: string, tag: string): Promise<ByteChannel>;
  /** Asks the devices around to announce themselves now. */
  search(): void;
  /**
   * Hears of devices that announce a tag without announcing it: a relay only
   * tells a device about the tags it listens for or watches.
   */
  watch?(tag: string): () => void;
}

/**
 * The tag of a pairing in progress, from the first three symbols of its code:
 * a relay brings the right devices together without learning the code (the
 * rest, 30 bits, is proven by CPace, three tries at most).
 */
export function pairingTag(code: string): string {
  return `pairing-${bytesToHex(hash(utf8(`cobblestone pairing tag ${code.slice(0, 3)}`))).slice(0, 12)}`;
}

export function vaultTag(syncId: string): string {
  return `vault-${bytesToHex(hash(utf8(`cobblestone vault ${syncId}`))).slice(0, 24)}`;
}

/** Devices on one network in memory, for tests: announcements go out when `announce()` is called. */
export class MemoryNetworkHub {
  private readonly nodes = new Set<MemoryNode>();
  private count = 0;

  /** A device's view of the network; `device` is the id it announces. */
  node(device: string): Network & { unplug(): void } {
    const node = new MemoryNode(this, `memory:${++this.count}`, device);
    this.nodes.add(node);
    return node;
  }

  /** Every device announces its tags to every other. */
  announce() {
    for (const from of this.nodes) for (const to of this.nodes) if (to !== from) from.announceTo(to);
  }

  find(address: string): MemoryNode | undefined {
    return [...this.nodes].find((n) => n.address === address && !n.unplugged);
  }

  remove(node: MemoryNode) {
    this.nodes.delete(node);
  }
}

class MemoryNode implements Network {
  readonly tags = new Map<string, number>();
  readonly found = new Set<(tag: string, address: string, device: string) => void>();
  readonly incoming = new Set<(link: ByteChannel, tag: string) => void>();
  private readonly links = new Set<ByteChannel>();
  unplugged = false;

  constructor(
    private readonly hub: MemoryNetworkHub,
    readonly address: string,
    readonly device: string,
  ) {}

  listen(tag: string) {
    this.tags.set(tag, (this.tags.get(tag) ?? 0) + 1);
    return () => {
      const left = (this.tags.get(tag) ?? 1) - 1;
      if (left) this.tags.set(tag, left);
      else this.tags.delete(tag);
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
    const target = this.hub.find(address);
    if (this.unplugged || !target?.tags.has(tag)) throw new Error(`Nobody listens for ${tag} at ${address}`);
    const [mine, theirs] = bytePair();
    this.links.add(mine);
    target.links.add(theirs);
    target.incoming.forEach((l) => l(theirs, tag));
    return mine;
  }

  search() {
    this.hub.announce();
  }

  announceTo(other: MemoryNode) {
    if (this.unplugged || other.unplugged) return;
    for (const tag of this.tags.keys()) other.found.forEach((l) => l(tag, this.address, this.device));
  }

  /** Leaves the network: its links break, as when a laptop closes. */
  unplug() {
    this.unplugged = true;
    this.links.forEach((l) => l.close());
    this.hub.remove(this);
  }
}
