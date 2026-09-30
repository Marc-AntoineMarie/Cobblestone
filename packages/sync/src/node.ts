import type { Vault } from '@cobblestone/core';
import { SyncRefusal, type ByteChannel } from './channel';
import { publicInfo, type DeviceIdentity, type DeviceInfo } from './identity';
import { newId } from './model';
import { PAIRING_TAG, vaultTag, type Network } from './network';
import { hostPairing, joinPairing, pairingCode, type VaultTicket } from './pairing';
import type { SyncChannel } from './protocol';
import { acceptSession, openSession } from './session';
import { VaultSync, type SyncStore } from './vault-sync';

/*
 * One device's part in the sync of a vault: keeps the vault and its CRDT in
 * step (VaultSync), finds the vault's other devices on the network, opens an
 * encrypted session with each, and pairs new devices with a code.
 */

export interface SyncNodeOptions {
  vault: Vault;
  store: SyncStore;
  identity: DeviceIdentity;
  network: Network;
  /** The vault's sync id, when this device received it from another. */
  syncId?: string;
  /**
   * Devices this device knew, kept outside the vault: trusted while the CRDT
   * knows nothing of them (its saved state was lost), so that the devices
   * still find each other and merge again.
   */
  known?: Pick<DeviceInfo, 'id' | 'publicKey'>[];
  saveDelay?: number;
}

export interface DeviceStatus extends DeviceInfo {
  removed: boolean;
  online: boolean;
  /** This device. */
  self: boolean;
}

export interface Pairing {
  code: string;
  /** The device, once the user accepted it; rejects when cancelled, expired, declined or after three wrong codes. */
  done: Promise<DeviceInfo>;
  cancel(): void;
}

export const PAIRING_LIFETIME = 5 * 60_000;
const REMOVAL_DELAY = 300;
const WRONG_CODE_GRACE = 3_000;
const PAIRING_ATTEMPTS = 3;

interface Live {
  channel: SyncChannel;
  /** The device that opened it: of two sessions with one device, both sides keep the same one. */
  initiator: string;
}

export class SyncNode {
  readonly sync: VaultSync;
  private readonly sessions = new Map<string, Live>();
  private readonly dialing = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private disposers: (() => void)[] = [];
  private running = false;
  private started = false;
  /** When a message last came or went. */
  lastExchange: number | null = null;

  constructor(private readonly options: SyncNodeOptions) {
    this.sync = new VaultSync(options.vault, options.store, { saveDelay: options.saveDelay });
  }

  get model() {
    return this.sync.model;
  }

  get syncId(): string {
    return this.model.syncId!;
  }

  get paused(): boolean {
    return this.started && !this.running;
  }

  /**
   * Starts following the vault and its devices. `first` is the link on which
   * this device just received the vault, used as the session with its host.
   */
  async start(first?: { channel: SyncChannel; peer: string }): Promise<void> {
    await this.sync.start();
    const me = this.options.identity;
    this.sync.change(() => {
      this.model.setSyncId(this.options.syncId ?? newId());
      if (!this.model.devices.has(me.id)) this.model.addDevice(publicInfo(me));
    });
    const onDevices = () => {
      for (const [peer, live] of this.sessions) {
        // A moment later, so that the removed device hears of it first.
        if (this.model.devices.get(peer)?.removed) setTimeout(() => live.channel.close(), REMOVAL_DELAY);
      }
      this.emit();
    };
    this.model.devices.observe(onDevices);
    this.disposers.push(() => this.model.devices.unobserve(onDevices));
    this.started = true;
    this.resume();
    if (first) this.adopt(first.channel, first.peer, first.peer);
  }

  /** Listens for the vault's devices and connects to those found. */
  resume() {
    if (this.running || !this.started) return;
    this.running = true;
    const { network } = this.options;
    const tag = vaultTag(this.syncId);
    this.connections = [
      network.listen(tag),
      network.onIncoming((link, t) => t === tag && void this.accept(link)),
      network.onFound((t, address, device) => t === tag && void this.dial(address, device)),
    ];
    network.search();
    this.emit();
  }

  private connections: (() => void)[] = [];

  /** Stops exchanging; changes stay on this device until `resume()`. */
  pause() {
    if (!this.running) return;
    this.running = false;
    this.connections.forEach((off) => off());
    this.connections = [];
    for (const live of [...this.sessions.values()]) live.channel.close();
    this.sessions.clear();
    this.emit();
  }

  async stop(): Promise<void> {
    this.pause();
    this.disposers.forEach((off) => off());
    this.disposers = [];
    await this.sync.stop();
  }

  devices(): DeviceStatus[] {
    const me = this.options.identity.id;
    return this.model.deviceList().map((d) => ({ ...d, self: d.id === me, online: d.id !== me && this.sessions.has(d.id) }));
  }

  /** Whether another device removed this one: the vault says so, or a device refused it for that. */
  get removed(): boolean {
    return this.toldRemoved || this.model.devices.get(this.options.identity.id)?.removed === true;
  }

  private toldRemoved = false;

  renameDevice(id: string, name: string) {
    this.sync.change(() => this.model.renameDevice(id, name.trim() || name));
  }

  /** The device is refused from now on; it keeps what it already received. */
  removeDevice(id: string) {
    this.sync.change(() => this.model.removeDevice(id));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  // ------------------------------------------------------------ sessions

  private readonly trusts = (id: string, publicKey: string) => {
    if (id === this.options.identity.id) return false;
    if (this.model.devices.has(id)) return this.model.trusts(id, publicKey);
    return this.options.known?.some((d) => d.id === id && d.publicKey === publicKey) ?? false;
  };

  private readonly isRemoved = (id: string) => this.model.devices.get(id)?.removed === true;

  private async dial(address: string, device: string) {
    if (!this.running || device === this.options.identity.id || this.sessions.has(device) || this.dialing.has(address)) return;
    this.dialing.add(address);
    try {
      const link = await this.options.network.connect(address, vaultTag(this.syncId));
      const session = await openSession(link, {
        identity: this.options.identity,
        vault: this.syncId,
        trusts: this.trusts,
        removed: this.isRemoved,
      });
      this.adopt(session.channel, session.peer, this.options.identity.id);
    } catch (error) {
      // Unreachable or refused: tried again at its next announcement.
      if (error instanceof SyncRefusal && error.code === 'removed' && !this.toldRemoved) {
        this.toldRemoved = true;
        this.emit();
      }
    } finally {
      this.dialing.delete(address);
    }
  }

  private async accept(link: ByteChannel) {
    try {
      const session = await acceptSession(link, {
        identity: this.options.identity,
        vault: this.syncId,
        trusts: this.trusts,
        removed: this.isRemoved,
      });
      this.adopt(session.channel, session.peer, session.peer);
    } catch {
      // Refused: the other device learns why.
    }
  }

  private adopt(channel: SyncChannel, peer: string, initiator: string) {
    if (!this.running) return channel.close();
    const existing = this.sessions.get(peer);
    if (existing) {
      const keeper = this.options.identity.id < peer ? this.options.identity.id : peer;
      if (existing.initiator === keeper && initiator !== keeper) return channel.close();
      existing.channel.close();
    }
    this.sessions.set(peer, { channel, initiator });
    channel.onClose(() => {
      if (this.sessions.get(peer)?.channel !== channel) return;
      this.sessions.delete(peer);
      this.emit();
    });
    this.sync.connect(this.watched(channel, peer));
    this.emit();
  }

  /** The channel, noting when something passes; a removed device is not heard any more. */
  private watched(channel: SyncChannel, peer: string): SyncChannel {
    const seen = () => {
      this.lastExchange = Date.now();
    };
    return {
      send: (message) => {
        seen();
        channel.send(message);
      },
      onMessage: (listener) =>
        channel.onMessage((message) => {
          if (this.model.devices.get(peer)?.removed) return;
          seen();
          listener(message);
        }),
      onClose: (listener) => channel.onClose(listener),
      close: () => channel.close(),
    };
  }

  // ------------------------------------------------------------ pairing

  /**
   * Shows a code and waits for a device to join with it. `approve` asks the
   * user once the device proved the code. The code lasts five minutes and
   * three wrong tries; a declined device ends it too.
   */
  startPairing(approve: (device: DeviceInfo) => Promise<boolean>): Pairing {
    const code = pairingCode();
    const { network, identity, vault } = this.options;
    let attempts = 0;
    let busy = false;
    let settled = false;
    let resolve!: (device: DeviceInfo) => void;
    let reject!: (error: Error) => void;
    const done = new Promise<DeviceInfo>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    done.catch(() => {});
    const finish = (error: Error | null, device?: DeviceInfo) => {
      if (settled) return;
      settled = true;
      stops.forEach((stop) => stop());
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(device!);
    };
    const timer = setTimeout(() => finish(new SyncRefusal('timeout')), PAIRING_LIFETIME);
    const stops = [
      network.listen(PAIRING_TAG),
      network.onIncoming((link, tag) => {
        if (tag !== PAIRING_TAG) return;
        if (settled || busy) return link.close();
        busy = true;
        hostPairing(link, { code, identity, vault: { id: this.syncId, name: vault.name }, approve })
          .then(({ device, channel }) => {
            this.sync.change(() => this.model.addDevice(device));
            finish(null, device);
            this.adopt(channel, device.id, device.id);
          })
          .catch((error: unknown) => {
            const refusal = error instanceof SyncRefusal ? error.code : null;
            if (refusal === 'declined' || (refusal === 'wrong-code' && ++attempts >= PAIRING_ATTEMPTS)) finish(error as Error);
          })
          .finally(() => (busy = false));
      }),
    ];
    network.search();
    return { code, done, cancel: () => finish(new SyncRefusal('closed')) };
  }
}

/**
 * Receives a vault from the device that shows `code`: tries each device that
 * offers a pairing around, until one proves the same code, then waits for
 * its user to accept. `onProven` says the code was right.
 */
export function receiveVault(
  network: Network,
  identity: DeviceIdentity,
  code: string,
  options: { timeout?: number; onProven?: () => void } = {},
): Promise<{ host: DeviceInfo; vault: VaultTicket; channel: SyncChannel }> {
  return new Promise((resolve, reject) => {
    const tried = new Set<string>();
    let settled = false;
    let lastError: Error = new SyncRefusal('timeout');
    const finish = (error: Error | null, joined?: Awaited<ReturnType<typeof joinPairing>>) => {
      if (settled) return joined?.channel.close();
      settled = true;
      off();
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(joined!);
    };
    let timer = setTimeout(() => finish(lastError), options.timeout ?? 30_000);
    const off = network.onFound(async (tag, address) => {
      if (tag !== PAIRING_TAG || settled || tried.has(address)) return;
      tried.add(address);
      try {
        const link = await network.connect(address, PAIRING_TAG);
        const joined = await joinPairing(link, {
          code,
          identity,
          onProven: () => {
            // The user of the other device decides now: no more hurry.
            clearTimeout(timer);
            timer = setTimeout(() => finish(new SyncRefusal('timeout')), 180_000);
            options.onProven?.();
          },
        });
        finish(null, joined);
      } catch (error) {
        lastError = error instanceof SyncRefusal && error.code !== 'closed' ? error : lastError;
        if (error instanceof SyncRefusal && error.code === 'declined') finish(error);
        // A device showed another code: others may still answer, but not for long.
        if (error instanceof SyncRefusal && error.code === 'wrong-code') {
          clearTimeout(timer);
          timer = setTimeout(() => finish(lastError), Math.min(WRONG_CODE_GRACE, options.timeout ?? WRONG_CODE_GRACE));
        }
      }
    });
    network.search();
  });
}
