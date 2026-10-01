import { SyncRefusal, type ByteChannel } from './channel';
import { bytesToHex, hash, utf8 } from './crypto';
import { publicInfo, readDevice, type DeviceIdentity, type DeviceInfo } from './identity';
import type { Network } from './network';
import type { SyncChannel } from './protocol';
import { acceptSession, openSession } from './session';

/*
 * The devices of one account find each other through the relay (the
 * "account" tag, which only the account's devices can reach). A device
 * the others do not trust yet asks to be let in: the device that answers
 * shows a six-digit check, computed from both devices' keys, which the new
 * device shows too. The user compares them and accepts: the server cannot
 * slip in a device of its own (its keys would give another check). Trusted
 * devices then tell each other which vaults they offer.
 */

export interface VaultOffer {
  /** Sync id of the vault. */
  id: string;
  name: string;
}

export interface AccountLinkOptions {
  network: Network;
  identity: DeviceIdentity;
  /** The account's devices this device trusts. */
  trusted(): DeviceInfo[];
  /** The vaults this device offers to the account's other devices. */
  offers(): VaultOffer[];
  /** A device asks to be let in: the user compares `check` with the one it shows. */
  ask(device: DeviceInfo, check: string): Promise<boolean>;
  /** This device asks to be let in: show `check` (null: no longer). */
  waiting(check: string | null): void;
  /** Devices to trust from now on (the one that let this device in, and those it trusts). */
  trust(devices: DeviceInfo[]): void;
  /** What another device of the account offers. */
  offered(from: DeviceInfo, offers: VaultOffer[]): void;
}

const ACCOUNT_TAG = 'account';
const SESSION_VAULT = 'account';
const REFRESH = 5 * 60_000;

/** Six digits from both keys, the same on both devices whatever their order. */
export function checkCode(a: string, b: string): string {
  const [first, second] = [a, b].sort();
  const digits = parseInt(bytesToHex(hash(utf8(`cobblestone account check ${first} ${second}`))).slice(0, 12), 16) % 1_000_000;
  const text = String(digits).padStart(6, '0');
  return `${text.slice(0, 3)} ${text.slice(3)}`;
}

type Message =
  | { t: 'who'; device: DeviceInfo }
  | { t: 'welcome'; devices: DeviceInfo[]; offers: VaultOffer[] }
  | { t: 'declined' }
  | { t: 'offers'; device: DeviceInfo; devices: DeviceInfo[]; offers: VaultOffer[] };

function send(channel: SyncChannel, message: Message) {
  channel.send({ type: 'account', data: utf8(JSON.stringify(message)) });
}

function next(channel: SyncChannel, timeout: number): Promise<Message> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new SyncRefusal('timeout')), timeout);
    const offMessage = channel.onMessage((message) => {
      if (message.type !== 'account') return;
      try {
        done(null, JSON.parse(new TextDecoder().decode(message.data)) as Message);
      } catch {
        done(new SyncRefusal('protocol'));
      }
    });
    const offClose = channel.onClose(() => done(new SyncRefusal('closed')));
    function done(error: Error | null, message?: Message) {
      clearTimeout(timer);
      offMessage();
      offClose();
      if (error) reject(error);
      else resolve(message!);
    }
  });
}

export class AccountLink {
  private stops: (() => void)[] = [];
  private busy = new Set<string>();
  private lastExchange = new Map<string, number>();

  constructor(private readonly options: AccountLinkOptions) {}

  private trusts = (id: string, key: string) => this.options.trusted().some((d) => d.id === id && d.publicKey === key);

  start() {
    const { network } = this.options;
    this.stops.push(
      network.listen(ACCOUNT_TAG),
      network.onIncoming((link, tag) => tag === ACCOUNT_TAG && void this.answer(link)),
      network.onFound((tag, address, device) => tag === ACCOUNT_TAG && void this.reach(address, device)),
    );
    network.search();
  }

  stop() {
    this.stops.forEach((stop) => stop());
    this.stops = [];
  }

  /** What this device tells another trusted one. */
  private news(): Message {
    return {
      t: 'offers',
      device: publicInfo(this.options.identity),
      devices: this.options.trusted(),
      offers: this.options.offers(),
    };
  }

  private take(message: Message, from: DeviceInfo) {
    if (message.t !== 'offers') return;
    // Devices it trusts become trusted here too: an account is one circle.
    this.options.trust(message.devices.map(readDevice).filter((d) => d.id !== this.options.identity.id));
    this.options.offered(from, message.offers);
  }

  /** A device of the account was found: exchange news, or ask to be let in. */
  private async reach(address: string, device: string) {
    if (device === this.options.identity.id || this.busy.has(device)) return;
    const known = this.options.trusted().find((d) => d.id === device);
    // A device trusted by no one asks; one already in the circle waits to be asked.
    if (!known && this.options.trusted().length) return;
    if (known && Date.now() - (this.lastExchange.get(device) ?? 0) < REFRESH) return;
    this.busy.add(device);
    let peerKey = '';
    try {
      const link = await this.options.network.connect(address, ACCOUNT_TAG);
      const session = await openSession(link, {
        identity: this.options.identity,
        vault: SESSION_VAULT,
        trusts: (id, key) => ((peerKey = key), known ? this.trusts(id, key) : id === device),
      });
      if (known) {
        send(session.channel, this.news());
        const answer = await next(session.channel, 15_000);
        this.take(answer, known);
        this.lastExchange.set(device, Date.now());
        session.channel.close();
        return;
      }
      // Asking to be let in: show the check the other device shows.
      send(session.channel, { t: 'who', device: publicInfo(this.options.identity) });
      this.options.waiting(checkCode(this.options.identity.publicKey, peerKey));
      const answer = await next(session.channel, 3 * 60_000).finally(() => this.options.waiting(null));
      if (answer.t === 'welcome') {
        this.options.trust(answer.devices.map(readDevice));
        const host = answer.devices.find((d) => d.id === session.peer);
        if (host) this.options.offered(host, answer.offers);
        this.lastExchange.set(device, Date.now());
      }
      session.channel.close();
    } catch {
      // Unreachable or refused: tried again later.
    } finally {
      this.busy.delete(device);
    }
  }

  /** Another device of the account came to this one. */
  private async answer(link: ByteChannel) {
    let peerKey = '';
    try {
      const session = await acceptSession(link, {
        identity: this.options.identity,
        vault: SESSION_VAULT,
        // Anyone of the account may knock; only a trusted device or one the user lets in gets anything.
        trusts: (_id, key) => ((peerKey = key), true),
      });
      const first = await next(session.channel, 15_000);
      if (first.t === 'offers' && this.trusts(session.peer, peerKey)) {
        const from = this.options.trusted().find((d) => d.id === session.peer)!;
        this.take(first, from);
        send(session.channel, this.news());
        this.lastExchange.set(session.peer, Date.now());
        return;
      }
      if (first.t !== 'who') return session.channel.close();
      const device = readDevice(first.device);
      if (device.id !== session.peer || device.publicKey !== peerKey) return session.channel.close();
      const check = checkCode(this.options.identity.publicKey, device.publicKey);
      if (!(await this.options.ask(device, check))) {
        send(session.channel, { t: 'declined' });
        return;
      }
      this.options.trust([device]);
      send(session.channel, {
        t: 'welcome',
        devices: [publicInfo(this.options.identity), ...this.options.trusted().filter((d) => d.id !== device.id)],
        offers: this.options.offers(),
      });
    } catch {
      // The other device left, or spoke out of turn.
    }
  }
}
