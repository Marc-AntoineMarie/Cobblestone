import { dirname, isInside, type Vault, type VaultAdapter } from '@cobblestone/core';
import * as Y from 'yjs';
import { applyTextDiff, hashBytes, kindOf, VaultDoc, type Entry } from './model';
import type { SyncChannel, SyncMessage } from './protocol';

/** Where a device keeps its copy of the CRDT between runs. */
export interface SyncStore {
  load(): Promise<Uint8Array | null>;
  save(state: Uint8Array): Promise<void>;
}

/** The CRDT in the vault's own settings folder, so it moves with the vault. */
export class AdapterSyncStore implements SyncStore {
  constructor(
    private readonly adapter: VaultAdapter,
    private readonly path = '.cobblestone/sync/vault.bin',
  ) {}
  async load() {
    if ((await this.adapter.stat(this.path))?.type !== 'file') return null;
    return this.adapter.readBinary(this.path);
  }
  async save(state: Uint8Array) {
    await this.adapter.mkdir(dirname(this.path));
    await this.adapter.writeBinary(this.path, state);
  }
}

/** Changes made on this device, from its files. */
const LOCAL = Symbol('local');
/** The state saved by a previous run. */
const STORE = Symbol('store');

interface Peer {
  channel: SyncChannel;
}

/**
 * Keeps a vault and its CRDT in step, both ways, and exchanges the CRDT with
 * other devices. The files stay the reference: an edit in the app or another
 * program becomes a CRDT change; a change from another device is written to
 * the files through the vault, so the app shows it like any other.
 */
export class VaultSync {
  readonly model: VaultDoc;
  private peers = new Set<Peer>();
  /** Which entry each file on this device's disk belongs to, both ways. */
  private idOnDisk = new Map<string, string>();
  private pathOfId = new Map<string, string>();
  /** Texts this device is writing, to recognise their echo from the vault. */
  private writing = new Map<string, string>();
  /** Renames ("from\nto") and deletions this device is making, for the same reason. */
  private echoes = new Set<string>();
  /** Hash of each binary file on disk. */
  private hashes = new Map<string, string>();
  /** Attachments wanted from other devices, by hash. */
  private wanted = new Map<string, string>();
  private dirty = new Set<string>();
  private queue: Promise<unknown> = Promise.resolve();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private disposers: (() => void)[] = [];
  private started = false;

  constructor(
    private readonly vault: Vault,
    private readonly store: SyncStore,
    private readonly options: { saveDelay?: number } = {},
  ) {
    this.model = new VaultDoc();
  }

  get doc(): Y.Doc {
    return this.model.doc;
  }

  /** Loads the saved CRDT, takes in what changed on disk meanwhile, and starts following both sides. */
  async start(): Promise<void> {
    const saved = await this.store.load();
    if (saved) Y.applyUpdate(this.doc, saved, STORE);
    for (const entry of this.model.live()) this.bind(entry.id, entry.path);
    await this.reconcile();
    this.doc.transact(() => this.model.settleConflicts(), LOCAL);
    this.rebind();

    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === STORE) return;
      for (const peer of this.peers) if (peer !== origin) peer.channel.send({ type: 'update', update });
      this.scheduleSave();
    };
    this.doc.on('update', onUpdate);
    this.disposers.push(() => this.doc.off('update', onUpdate));

    // What other devices changed: noted by entry, written once the transaction is over.
    const onDeep = (events: Y.YEvent<Y.AbstractType<unknown>>[], transaction: Y.Transaction) => {
      if (transaction.origin === LOCAL || transaction.origin === STORE) return;
      for (const event of events) {
        if (event.target === this.model.files) {
          for (const key of (event as Y.YMapEvent<unknown>).keysChanged) this.dirty.add(key);
        } else {
          const id = this.entryIdOf(event.target);
          if (id) this.dirty.add(id);
        }
      }
    };
    this.model.files.observeDeep(onDeep);
    this.disposers.push(() => this.model.files.unobserveDeep(onDeep));
    const onAfter = (transaction: Y.Transaction) => {
      if (transaction.origin !== LOCAL && transaction.origin !== STORE && this.dirty.size) this.run(() => this.applyRemote());
    };
    this.doc.on('afterTransaction', onAfter);
    this.disposers.push(() => this.doc.off('afterTransaction', onAfter));

    this.disposers.push(
      this.vault.on('create', (file) => this.run(() => this.onLocalChange(file.path, null))),
      this.vault.on('modify', (file, content) => this.run(() => this.onLocalChange(file.path, content))),
      this.vault.on('rename', (path, oldPath, kind) => this.run(() => this.onLocalRename(path, oldPath, kind))),
      this.vault.on('delete', (path, kind) => this.run(() => this.onLocalDelete(path, kind))),
    );
    this.started = true;
  }

  /** Stops following the vault and the other devices, after saving. */
  async stop(): Promise<void> {
    for (const peer of [...this.peers]) peer.channel.close();
    this.disposers.forEach((d) => d());
    this.disposers = [];
    await this.settled();
    clearTimeout(this.saveTimer);
    if (this.started) await this.store.save(Y.encodeStateAsUpdate(this.doc));
    this.started = false;
  }

  /** Resolves once every change already received has reached the files, and the files the CRDT. */
  async settled(): Promise<void> {
    let last: Promise<unknown>;
    do {
      last = this.queue;
      await last;
      await this.vault.settled();
    } while (last !== this.queue);
  }

  /** Changes the CRDT as this device (devices, settings of the sync), not as a file. */
  change(apply: () => void) {
    this.doc.transact(apply, LOCAL);
  }

  /** Starts exchanging with another device; returns a function that ends it. */
  connect(channel: SyncChannel): () => void {
    const peer: Peer = { channel };
    this.peers.add(peer);
    const offMessage = channel.onMessage((message) => this.onMessage(peer, message));
    const offClose = channel.onClose(() => {
      this.peers.delete(peer);
      offMessage();
      offClose();
    });
    channel.send({ type: 'hello', stateVector: Y.encodeStateVector(this.doc) });
    for (const hash of this.wanted.keys()) channel.send({ type: 'blob-request', hash });
    return () => channel.close();
  }

  // ------------------------------------------------------------ this device's files → CRDT

  /** Files created, changed or deleted while the app was closed. */
  private async reconcile() {
    const onDisk = new Set<string>();
    for (const file of this.vault.getFiles()) {
      onDisk.add(file.path);
      await this.onLocalChange(file.path, null);
    }
    this.doc.transact(() => {
      for (const [id, path] of [...this.pathOfId]) {
        if (!onDisk.has(path)) {
          this.model.set(id, { deleted: true });
          this.unbind(id);
        }
      }
    }, LOCAL);
  }

  private async onLocalChange(path: string, content: string | null) {
    if (!this.vault.getFile(path)) return;
    if (content !== null && this.writing.get(path) === content) {
      this.writing.delete(path);
      return;
    }
    const id = this.idOnDisk.get(path);
    if (kindOf(path) === 'text') {
      const text = content ?? (await this.vault.read(path).catch(() => null));
      if (text === null) return;
      this.doc.transact(() => {
        const existing = id ? this.model.text(id) : null;
        if (existing) applyTextDiff(existing, text);
        else this.bind(this.model.add(path, { text }), path);
      }, LOCAL);
    } else {
      const data = await this.vault.readBinary(path).catch(() => null);
      if (!data) return;
      const hash = await hashBytes(data);
      this.hashes.set(path, hash);
      this.doc.transact(() => {
        if (id) this.model.set(id, { hash, size: data.byteLength });
        else this.bind(this.model.add(path, { hash, size: data.byteLength }), path);
      }, LOCAL);
    }
  }

  private async onLocalRename(path: string, oldPath: string, kind: 'file' | 'folder') {
    if (this.echoes.delete(`${oldPath}\n${path}`)) return;
    this.doc.transact(() => {
      const moves: [string, string][] =
        kind === 'file'
          ? [[oldPath, path]]
          : [...this.idOnDisk.keys()].filter((p) => isInside(p, oldPath)).map((p) => [p, path + p.slice(oldPath.length)]);
      for (const [from, to] of moves) {
        const id = this.idOnDisk.get(from);
        if (!id) continue;
        this.unbind(id);
        this.bind(id, to);
        this.model.set(id, { path: to });
        const hash = this.hashes.get(from);
        if (hash) {
          this.hashes.delete(from);
          this.hashes.set(to, hash);
        }
      }
    }, LOCAL);
  }

  private async onLocalDelete(path: string, kind: 'file' | 'folder') {
    if (this.echoes.delete(`delete\n${path}`)) return;
    this.doc.transact(() => {
      const gone = kind === 'file' ? [path] : [...this.idOnDisk.keys()].filter((p) => isInside(p, path));
      for (const p of gone) {
        const id = this.idOnDisk.get(p);
        if (!id) continue;
        this.model.set(id, { deleted: true });
        this.unbind(id);
        this.hashes.delete(p);
      }
    }, LOCAL);
  }

  // ------------------------------------------------------------ other devices → CRDT → files

  private onMessage(peer: Peer, message: SyncMessage) {
    switch (message.type) {
      case 'hello':
        peer.channel.send({ type: 'update', update: Y.encodeStateAsUpdate(this.doc, message.stateVector) });
        return;
      case 'update':
        Y.applyUpdate(this.doc, message.update, peer);
        return;
      case 'blob-request':
        this.run(() => this.sendBlob(peer, message.hash));
        return;
      case 'blob':
        this.run(() => this.receiveBlob(message.hash, message.data));
        return;
      case 'blob-missing':
        return;
    }
  }

  /**
   * Writes to the files what other devices changed, in three passes:
   * deletions, then moves (a file leaves before another takes its place),
   * then contents. Conflicts of names are settled first, the same way on
   * every device.
   */
  private async applyRemote() {
    this.doc.transact(() => this.model.settleConflicts(), LOCAL);
    const dirty = new Set(this.dirty);
    this.dirty.clear();
    const concerned = this.model.entries().filter((e) => dirty.has(e.id) || (!e.deleted && this.pathOfId.get(e.id) !== e.path));

    for (const entry of concerned.filter((e) => e.deleted)) {
      const current = this.pathOfId.get(entry.id);
      this.unbind(entry.id);
      if (current !== undefined && this.vault.getFile(current) && !this.idOnDisk.has(current)) {
        await this.unheard(`delete\n${current}`, () => this.vault.delete(current));
      }
    }

    // Moves, until none can go further; a cycle (two names swapped) goes through a free name.
    let moving = concerned.filter((e) => !e.deleted && this.pathOfId.has(e.id) && this.pathOfId.get(e.id) !== e.path);
    while (moving.length) {
      const next: Entry[] = [];
      for (const entry of moving) {
        const current = this.pathOfId.get(entry.id)!;
        if (!this.vault.getFile(current)) {
          this.unbind(entry.id);
          continue;
        }
        if (this.vault.getFile(entry.path)) {
          next.push(entry);
          continue;
        }
        this.bind(entry.id, entry.path);
        await this.unheard(`${current}\n${entry.path}`, () => this.vault.rename(current, entry.path, { updateLinks: false }));
      }
      if (next.length === moving.length) {
        const stuck = next.shift()!;
        const current = this.pathOfId.get(stuck.id)!;
        const aside = `${current}.${stuck.id}.moving`;
        this.bind(stuck.id, aside);
        await this.unheard(`${current}\n${aside}`, () => this.vault.rename(current, aside, { updateLinks: false }));
        next.push(stuck);
      }
      moving = next;
    }

    for (const entry of concerned.filter((e) => !e.deleted)) await this.writeContent(entry);
    this.rebind();
  }

  /** Puts an entry's content in its file, creating it if needed; an attachment is asked for. */
  private async writeContent(entry: Entry) {
    const owner = this.idOnDisk.get(entry.path);
    if (owner !== undefined && owner !== entry.id && this.vault.getFile(entry.path)) {
      const other = this.model.entry(owner);
      // Another live file still sits here: this one waits for the next pass.
      if (other && !other.deleted) return;
    }
    this.bind(entry.id, entry.path);
    if (entry.kind === 'text') {
      const text = this.model.text(entry.id)?.toString() ?? '';
      if (!this.vault.getFile(entry.path)) {
        // Its echo comes without content, and finds the CRDT already holding it.
        await this.vault.create(entry.path, text);
      } else if ((await this.vault.read(entry.path)) !== text) {
        this.writing.set(entry.path, text);
        await this.vault.modify(entry.path, text);
      }
    } else if (entry.hash && this.hashes.get(entry.path) !== entry.hash) {
      this.wanted.set(entry.hash, entry.id);
      for (const peer of this.peers) peer.channel.send({ type: 'blob-request', hash: entry.hash });
    }
  }

  private async sendBlob(peer: Peer, hash: string) {
    const path = [...this.hashes].find(([, h]) => h === hash)?.[0];
    const data = path ? await this.vault.readBinary(path).catch(() => null) : null;
    peer.channel.send(data ? { type: 'blob', hash, data } : { type: 'blob-missing', hash });
  }

  private async receiveBlob(hash: string, data: Uint8Array) {
    const id = this.wanted.get(hash);
    if (!id || (await hashBytes(data)) !== hash) return;
    this.wanted.delete(hash);
    const entry = this.model.entry(id);
    if (!entry || entry.deleted || entry.hash !== hash) return;
    this.hashes.set(entry.path, hash);
    this.bind(id, entry.path);
    if (this.vault.getFile(entry.path)) await this.vault.modifyBinary(entry.path, data);
    else await this.vault.createBinary(entry.path, data);
  }

  // ------------------------------------------------------------ bookkeeping

  /** Renames or deletes a file without hearing it back as a change of this device. */
  private async unheard(echo: string, operation: () => Promise<unknown>) {
    this.echoes.add(echo);
    try {
      await operation();
    } catch (error) {
      this.echoes.delete(echo);
      throw error;
    }
  }

  private bind(id: string, path: string) {
    const previous = this.pathOfId.get(id);
    if (previous !== undefined && this.idOnDisk.get(previous) === id) this.idOnDisk.delete(previous);
    this.pathOfId.set(id, path);
    this.idOnDisk.set(path, id);
  }

  private unbind(id: string) {
    const path = this.pathOfId.get(id);
    if (path !== undefined && this.idOnDisk.get(path) === id) this.idOnDisk.delete(path);
    this.pathOfId.delete(id);
  }

  /** After conflicts are settled: each file on disk belongs to the live entry of its path. */
  private rebind() {
    for (const entry of this.model.live()) {
      if (this.vault.getFile(entry.path) && this.pathOfId.get(entry.id) === entry.path) this.idOnDisk.set(entry.path, entry.id);
    }
    for (const entry of this.model.entries().filter((e) => e.deleted)) {
      const path = this.pathOfId.get(entry.id);
      if (path !== undefined && this.idOnDisk.get(path) !== entry.id) this.pathOfId.delete(entry.id);
    }
  }

  private entryIdOf(type: Y.AbstractType<unknown>): string | null {
    let node: Y.AbstractType<unknown> | null = type;
    while (node && node.parent !== this.model.files) node = node.parent as Y.AbstractType<unknown> | null;
    if (!node) return null;
    for (const [id, map] of this.model.files) if (map === node) return id;
    return null;
  }

  private run(task: () => Promise<void>) {
    this.queue = this.queue.then(task).catch((error: unknown) => console.error('Sync', error));
  }

  private scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.store.save(Y.encodeStateAsUpdate(this.doc)), this.options.saveDelay ?? 1000);
  }
}
