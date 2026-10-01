import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Vault } from '@cobblestone/core';
import {
  AdapterSyncStore,
  createIdentity,
  fromBase64,
  toBase64,
  PAIRING_LIFETIME,
  receiveVault,
  SyncNode,
  SyncRefusal,
  type DeviceIdentity,
  type DeviceInfo,
  type DeviceStatus,
  type Pairing,
  type RefusalCode,
  type SyncChannel,
  type VaultTicket,
} from '@cobblestone/sync';
import * as Y from 'yjs';
import type { LiveSource, RemoteCursor } from './editor/collab';
import { describeError } from './errors';
import { t } from './i18n';
import type { Platform, VaultEntry } from './platform';

/*
 * The sync of the open vault, for the interface. What sync means on this
 * device is kept in the host's storage, never in the vault: the device's key
 * pair, and which vaults it syncs (a vault copied to another computer does
 * not start syncing as this device).
 */

const IDENTITY_KEY = 'sync:identity';
const VAULTS_KEY = 'sync:vaults';

interface VaultRecord {
  syncId: string;
  paused?: boolean;
  /** Devices of the vault this device knew, to find them again if the vault's sync state is lost. */
  known?: { id: string; publicKey: string }[];
}

export type PairingState =
  | { stage: 'code'; code: string; expires: number }
  | { stage: 'approve'; code: string; device: DeviceInfo }
  | { stage: 'done'; device: DeviceInfo }
  | { stage: 'failed'; reason: RefusalCode | 'error' };

export interface SyncState {
  /** This host can sync (the desktop app, for now). */
  available: boolean;
  /** This vault syncs on this device. */
  enabled: boolean;
  paused: boolean;
  /** Another device removed this one. */
  removed: boolean;
  devices: DeviceStatus[];
  lastExchange: number | null;
  /** Attachments still on their way from other devices. */
  receiving: number;
  /** Files this device could not write (a full disk…), and why: they are written again later. */
  failed: number;
  failure: string | null;
  pairing: PairingState | null;
}

export type Received = { host: DeviceInfo; vault: VaultTicket; channel: SyncChannel };

/** Links handed from the "receive a vault" dialog to the session that opens that vault. */
const handoffs = new Map<string, { channel: SyncChannel; peer: string }>();

function defaultName(platform: Platform): string {
  if (platform.kind === 'web') return t('sync.defaultName.web');
  const os = platform.os === 'mac' ? 'Mac' : platform.os === 'windows' ? 'Windows' : 'Linux';
  return t('sync.defaultName.desktop', { os });
}

/** This device's key pair and name, made the first time sync is used. */
export async function loadIdentity(platform: Platform): Promise<DeviceIdentity> {
  const stored = await platform.storage.get<DeviceIdentity>(IDENTITY_KEY);
  if (stored) return stored;
  const identity = createIdentity(defaultName(platform), platform.kind === 'web' ? 'web' : 'desktop');
  await platform.storage.set(IDENTITY_KEY, identity);
  return identity;
}

async function renameIdentity(platform: Platform, name: string): Promise<DeviceIdentity> {
  const identity = { ...(await loadIdentity(platform)), name };
  await platform.storage.set(IDENTITY_KEY, identity);
  return identity;
}

async function records(platform: Platform) {
  return (await platform.storage.get<Record<string, VaultRecord>>(VAULTS_KEY)) ?? {};
}

async function saveRecord(platform: Platform, id: string, record: VaultRecord | null) {
  const all = { ...(await records(platform)) };
  if (record) all[id] = record;
  else delete all[id];
  await platform.storage.set(VAULTS_KEY, all);
}

/**
 * Receives a vault from the device that shows `code`, as the device named
 * `name`. `onProven` says the code was right and the other user decides.
 */
export async function receiveWithCode(platform: Platform, code: string, name: string, onProven: () => void): Promise<Received> {
  const identity = name.trim() ? await renameIdentity(platform, name.trim()) : await loadIdentity(platform);
  return receiveVault(platform.syncNetwork!(identity.id), identity, code, { onProven });
}

/** The vault just received goes to `entry`: its session starts syncing on the same link. */
export async function adoptReceived(platform: Platform, entry: VaultEntry, received: Received) {
  await saveRecord(platform, entry.id, { syncId: received.vault.id });
  handoffs.set(entry.id, { channel: received.channel, peer: received.host.id });
}

export class SyncController {
  readonly state: StoreApi<SyncState>;
  private node: SyncNode | null = null;
  private pairing: Pairing | null = null;
  private answer: ((ok: boolean) => void) | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private offNode: (() => void) | null = null;
  private disposed = false;

  constructor(
    private readonly platform: Platform,
    private readonly entry: VaultEntry,
    private readonly vault: Vault,
  ) {
    this.state = createStore<SyncState>(() => ({
      available: !!platform.syncNetwork && entry.kind !== 'demo',
      enabled: false,
      paused: false,
      removed: false,
      devices: [],
      lastExchange: null,
      receiving: 0,
      failed: 0,
      failure: null,
      pairing: null,
    }));
  }

  /** Starts syncing if this vault syncs on this device. */
  async attach(): Promise<void> {
    if (!this.state.getState().available) return;
    const record = (await records(this.platform))[this.entry.id];
    const first = handoffs.get(this.entry.id);
    handoffs.delete(this.entry.id);
    if (!record) return first?.channel.close();
    this.known = record.known ?? [];
    await this.start(record.syncId, first);
    if (record.paused && !first) this.node?.pause();
    this.refresh();
  }

  private async start(syncId?: string, first?: { channel: SyncChannel; peer: string }) {
    const identity = await loadIdentity(this.platform);
    const node = new SyncNode({
      vault: this.vault,
      store: new AdapterSyncStore(this.vault.adapter),
      identity,
      network: this.platform.syncNetwork!(identity.id),
      syncId,
      known: this.known,
    });
    await node.start(first);
    if (this.disposed) return void node.stop();
    this.node = node;
    await this.saveRecord();
    const offPresence = node.onPresence(() => this.cursorListeners.forEach((l) => l()));
    const offRefresh = node.subscribe(() => this.refresh());
    this.offNode = () => {
      offPresence();
      offRefresh();
    };
    this.timer = setInterval(() => this.refresh(), 1000);
  }

  private known: { id: string; publicKey: string }[] = [];

  private saveRecord() {
    const node = this.node;
    if (!node) return Promise.resolve();
    return saveRecord(this.platform, this.entry.id, { syncId: node.syncId, paused: node.paused || undefined, known: this.known });
  }

  /** Saves the sync state now (the window is closing). */
  flush() {
    void this.node?.sync.flush().catch(() => undefined);
  }

  private refresh() {
    const node = this.node;
    if (!node) return;
    const current = this.state.getState();
    const devices = node.devices();
    const known = devices.filter((d) => !d.self && !d.removed).map(({ id, publicKey }) => ({ id, publicKey }));
    if (JSON.stringify(known) !== JSON.stringify(this.known) && known.length) {
      this.known = known;
      void this.saveRecord();
    }
    const next = {
      enabled: true,
      paused: node.paused,
      removed: node.removed,
      devices: JSON.stringify(devices) === JSON.stringify(current.devices) ? current.devices : devices,
      lastExchange: node.lastExchange,
      receiving: node.sync.pendingAttachments,
      failed: node.sync.failedWrites.count,
      failure: node.sync.failedWrites.count ? describeError(node.sync.failedWrites.error) : null,
    };
    if (Object.entries(next).some(([key, value]) => current[key as keyof SyncState] !== value)) this.state.setState(next);
  }

  /** Shows a code for a new device; turns sync on for this vault if it was not. */
  async addDevice() {
    if (!this.node) await this.start();
    const node = this.node;
    if (!node) return;
    if (node.paused) this.resume();
    this.pairing?.cancel();
    const pairing = node.startPairing(
      (device) =>
        new Promise<boolean>((resolve) => {
          this.answer = resolve;
          this.state.setState({ pairing: { stage: 'approve', code: pairing.code, device } });
        }),
    );
    this.pairing = pairing;
    this.state.setState({ pairing: { stage: 'code', code: pairing.code, expires: Date.now() + PAIRING_LIFETIME } });
    pairing.done.then(
      (device) => {
        if (this.pairing === pairing) this.state.setState({ pairing: { stage: 'done', device } });
        this.refresh();
      },
      (error: unknown) => {
        if (this.pairing !== pairing) return;
        const reason = error instanceof SyncRefusal ? error.code : 'error';
        this.state.setState({ pairing: reason === 'closed' ? null : { stage: 'failed', reason } });
      },
    );
  }

  answerPairing(accept: boolean) {
    this.answer?.(accept);
    this.answer = null;
  }

  closePairing() {
    const pairing = this.pairing;
    this.pairing = null;
    this.answerPairing(false);
    pairing?.cancel();
    this.state.setState({ pairing: null });
  }

  pause() {
    this.node?.pause();
    void this.saveRecord();
    this.refresh();
  }

  resume() {
    this.node?.resume();
    void this.saveRecord();
    this.refresh();
  }

  removeDevice(id: string) {
    this.node?.removeDevice(id);
  }

  // ------------------------------------------------------------ writing together

  private readonly cursorListeners = new Set<() => void>();
  /** The editor whose cursor the other devices see. */
  private publisher: object | null = null;

  /** What an editor of `path` works on, to write together with the other devices. */
  liveSource(path: () => string): LiveSource {
    const token = {};
    return {
      text: () => this.node?.sync.textAt(path()) ?? null,
      edit: (apply) => (this.node ? this.node.sync.change(apply) : apply()),
      own: (origin) => this.node?.sync.isOwn(origin) ?? true,
      cursors: () => this.cursorsIn(path()),
      subscribe: (listener) => {
        this.cursorListeners.add(listener);
        return () => void this.cursorListeners.delete(listener);
      },
      publish: (anchor, head) => {
        const node = this.node;
        const text = node?.sync.textAt(path());
        const entry = node?.sync.entryAt(path());
        if (!node || !text || !entry) return;
        const at = (index: number) => toBase64(Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text, index)));
        this.publisher = token;
        node.publishPresence(new TextEncoder().encode(JSON.stringify({ entry, anchor: at(anchor), head: at(head) })));
      },
      saving: (text) => {
        if (this.node?.sync.textAt(path())) this.node.sync.expectWrite(path(), text);
      },
      leave: () => {
        if (this.publisher !== token) return;
        this.publisher = null;
        this.node?.publishPresence(null);
      },
    };
  }

  private cursorsIn(path: string): RemoteCursor[] {
    const node = this.node;
    const entry = node?.sync.entryAt(path);
    if (!node || !entry) return [];
    const devices = node.devices();
    const cursors: RemoteCursor[] = [];
    for (const [device, data] of node.presences()) {
      const info = devices.find((d) => d.id === device && !d.removed);
      if (!info) continue;
      try {
        const where = JSON.parse(new TextDecoder().decode(data)) as { entry: string; anchor: string; head: string };
        if (where.entry !== entry) continue;
        const at = (rel: string) =>
          Y.createAbsolutePositionFromRelativePosition(Y.decodeRelativePosition(fromBase64(rel)), node.model.doc)?.index;
        const anchor = at(where.anchor);
        const head = at(where.head);
        if (anchor === undefined || head === undefined) continue;
        cursors.push({ device, name: info.name, ink: parseInt(device.slice(0, 4), 16) % 5, anchor, head });
      } catch {
        // Another device's presence that cannot be read: not shown.
      }
    }
    return cursors;
  }

  /** The name other devices know this one by. */
  async deviceName(): Promise<string> {
    return (await loadIdentity(this.platform)).name;
  }

  async renameThisDevice(name: string) {
    if (!name.trim()) return;
    const identity = await renameIdentity(this.platform, name.trim());
    this.node?.renameDevice(identity.id, identity.name);
  }

  dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    this.offNode?.();
    this.closePairing();
    void this.node?.stop();
    this.node = null;
  }
}
