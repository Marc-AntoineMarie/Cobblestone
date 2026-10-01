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
  private folderMade = false;

  constructor(
    private readonly adapter: VaultAdapter,
    private readonly path = '.cobblestone/sync/vault.bin',
  ) {}
  async load() {
    if ((await this.adapter.stat(this.path))?.type !== 'file') return null;
    return this.adapter.readBinary(this.path);
  }
  /** One write once the folder exists: a save as the window closes has time for one call. */
  async save(state: Uint8Array) {
    if (!this.folderMade) await this.adapter.mkdir(dirname(this.path));
    this.folderMade = true;
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
  private writing = new Map<string, Set<string>>();
  /** Renames ("from\nto") and deletions this device is making, for the same reason. */
  private echoes = new Set<string>();
  /** Hash of each binary file on disk. */
  private hashes = new Map<string, string>();
  /** Attachments wanted from other devices, by hash. */
  private wanted = new Map<string, string>();
  private dirty = new Set<string>();
  /** Entries this device could not write (a full disk…), with why: tried again a little later. */
  private failed = new Map<string, unknown>();
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private disposers: (() => void)[] = [];
  private started = false;

  constructor(
    private readonly vault: Vault,
    private readonly store: SyncStore,
    private readonly options: { saveDelay?: number; retryDelay?: number } = {},
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
      this.vault.on('create-folder', (folder) => this.run(async () => this.onLocalFolder(folder.path))),
      this.vault.on('modify', (file, content) => this.run(() => this.onLocalChange(file.path, content))),
      this.vault.on('rename', (path, oldPath, kind) => this.run(() => this.onLocalRename(path, oldPath, kind))),
      this.vault.on('delete', (path, kind) => this.run(() => this.onLocalDelete(path, kind))),
    );
    this.started = true;
  }

  /** Saves the CRDT now instead of in a moment (the window is closing). */
  flush(): Promise<void> {
    if (!this.started) return Promise.resolve();
    clearTimeout(this.saveTimer);
    return this.store.save(Y.encodeStateAsUpdate(this.doc));
  }

  /** Stops following the vault and the other devices, after saving. */
  async stop(): Promise<void> {
    for (const peer of [...this.peers]) peer.channel.close();
    this.disposers.forEach((d) => d());
    this.disposers = [];
    clearTimeout(this.retryTimer);
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

  /**
   * A text about to be saved that the CRDT already holds (an editor working
   * on the shared text): its echo is not a change, and comparing it with a
   * shared text that moved on since would undo what others typed meanwhile.
   */
  expectWrite(path: string, text: string) {
    let texts = this.writing.get(path);
    if (!texts) this.writing.set(path, (texts = new Set()));
    texts.add(text);
  }

  /** The shared text of a note on disk, for an editor to work on directly. */
  textAt(path: string): Y.Text | null {
    const id = this.idOnDisk.get(path);
    return id ? this.model.text(id) : null;
  }

  /** The entry of a file on disk. */
  entryAt(path: string): string | null {
    return this.idOnDisk.get(path) ?? null;
  }

  /** Whether a change of the CRDT was made on this device. */
  isOwn(origin: unknown): boolean {
    return origin === LOCAL || origin === STORE;
  }

  /** Attachments this device still waits for from the others. */
  get pendingAttachments(): number {
    return this.wanted.size;
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
    for (const folder of this.vault.getFolders()) {
      onDisk.add(folder.path);
      this.onLocalFolder(folder.path);
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
    if (content !== null && this.writing.get(path)?.delete(content)) {
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

  /** A folder of this device, empty ones included. */
  private onLocalFolder(path: string) {
    if (!path || this.idOnDisk.has(path) || path.split('/').some((part) => part.startsWith('.'))) return;
    if (!this.vault.getFolder(path)) return;
    this.doc.transact(() => this.bind(this.model.add(path, { folder: true }), path), LOCAL);
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
      case 'presence':
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

    // Files first, then folders from the deepest: a folder goes only once empty.
    const depth = (e: Entry) => (e.kind === 'folder' ? 1000 - (this.pathOfId.get(e.id) ?? '').split('/').length : 0);
    for (const entry of concerned.filter((e) => e.deleted).sort((a, b) => depth(a) - depth(b))) {
      const current = this.pathOfId.get(entry.id);
      this.unbind(entry.id);
      if (current === undefined || this.idOnDisk.has(current)) continue;
      const gone = entry.kind === 'folder' ? this.isEmptyFolder(current) : !!this.vault.getFile(current);
      if (gone) await this.unheard(`delete\n${current}`, () => this.vault.delete(current));
    }

    // Folders moved: the new one is made now, the old one goes once its files have left.
    const leftFolders: string[] = [];
    for (const entry of concerned.filter((e) => !e.deleted && e.kind === 'folder' && this.pathOfId.get(e.id) !== e.path)) {
      const current = this.pathOfId.get(entry.id);
      this.bind(entry.id, entry.path);
      if (current !== undefined) leftFolders.push(current);
      if (!this.vault.getFolder(entry.path)) await this.vault.createFolder(entry.path);
    }

    // Moves, until none can go further; a cycle (two names swapped) goes through a free name.
    let moving = concerned.filter(
      (e) => !e.deleted && e.kind !== 'folder' && this.pathOfId.has(e.id) && this.pathOfId.get(e.id) !== e.path,
    );
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

    for (const old of leftFolders.sort((a, b) => b.split('/').length - a.split('/').length)) {
      if (!this.idOnDisk.has(old) && this.isEmptyFolder(old)) await this.unheard(`delete\n${old}`, () => this.vault.delete(old));
    }

    for (const entry of concerned.filter((e) => !e.deleted)) {
      try {
        await this.writeContent(entry);
        this.failed.delete(entry.id);
      } catch (error) {
        this.failedWrite(entry.id, error);
      }
    }
    this.rebind();
  }

  private isEmptyFolder(path: string): boolean {
    if (!this.vault.getFolder(path)) return false;
    const { folders, files } = this.vault.getChildren(path);
    return folders.length === 0 && files.length === 0;
  }

  /** Puts an entry's content in its file, creating it if needed; an attachment is asked for. */
  private async writeContent(entry: Entry) {
    const owner = this.idOnDisk.get(entry.path);
    if (owner !== undefined && owner !== entry.id && this.vault.exists(entry.path)) {
      const other = this.model.entry(owner);
      // Another live file still sits here: this one waits for the next pass.
      if (other && !other.deleted) return;
    }
    this.bind(entry.id, entry.path);
    if (entry.kind === 'folder') {
      if (!this.vault.getFolder(entry.path)) await this.vault.createFolder(entry.path);
    } else if (entry.kind === 'text') {
      const text = this.model.text(entry.id)?.toString() ?? '';
      if (!this.vault.getFile(entry.path)) {
        // Its echo comes without content, and finds the CRDT already holding it.
        await this.vault.create(entry.path, text);
      } else if ((await this.vault.read(entry.path)) !== text) {
        this.expectWrite(entry.path, text);
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
    this.bind(id, entry.path);
    try {
      if (this.vault.getFile(entry.path)) await this.vault.modifyBinary(entry.path, data);
      else await this.vault.createBinary(entry.path, data);
      this.hashes.set(entry.path, hash);
      this.failed.delete(id);
    } catch (error) {
      this.failedWrite(id, error);
    }
  }

  /** Files this device could not write, and the last reason. */
  get failedWrites(): { count: number; error: unknown } {
    return { count: this.failed.size, error: [...this.failed.values()].at(-1) ?? null };
  }

  /** Nothing is lost (the CRDT keeps it): the entry is written again in a while. */
  private failedWrite(id: string, error: unknown) {
    this.failed.set(id, error);
    this.dirty.add(id);
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (this.started && this.dirty.size) this.run(() => this.applyRemote());
    }, this.options.retryDelay ?? 30_000);
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
      if (this.vault.exists(entry.path) && this.pathOfId.get(entry.id) === entry.path) this.idOnDisk.set(entry.path, entry.id);
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
