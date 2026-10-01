import { createStore } from 'zustand/vanilla';
import { AccountLink, type DeviceInfo } from '@cobblestone/sync';
import { currentAccount, onAccountChange } from './account';
import type { Platform } from './platform';
import { accountOffers, accountTrusted, addAccountTrusted, deviceNetworkFor, loadIdentity, localSyncIds } from './sync';

/*
 * This device among its account's devices: asks to be let in (showing the
 * check to compare), lets others in (asking the user), and gathers the
 * vaults the others offer. Runs while the device is signed in.
 */

export interface OfferedVault {
  id: string;
  name: string;
  /** The device it is on. */
  from: string;
}

export interface LinkState {
  /** This device asks to be let in: the check to compare on another device. */
  waiting: string | null;
  /** Another device asks to be let in. */
  request: { device: DeviceInfo; check: string } | null;
  /** Vaults of the account not on this device yet. */
  offers: OfferedVault[];
}

const OFFERS_KEY = 'account:offers';

export const linkState = createStore<LinkState>(() => ({ waiting: null, request: null, offers: [] }));

let link: AccountLink | null = null;
let answer: ((accept: boolean) => void) | null = null;

export function answerRequest(accept: boolean) {
  answer?.(accept);
  answer = null;
  linkState.setState({ request: null });
}

async function refreshOffers(platform: Platform, more: OfferedVault[] = []) {
  const known = (await platform.storage.get<OfferedVault[]>(OFFERS_KEY)) ?? [];
  const merged = [...known.filter((o) => !more.some((m) => m.id === o.id)), ...more];
  await platform.storage.set(OFFERS_KEY, merged);
  const here = await localSyncIds(platform);
  linkState.setState({ offers: merged.filter((o) => !here.has(o.id)) });
}

async function start(platform: Platform) {
  if (link) return;
  const identity = await loadIdentity(platform);
  let trusted = await accountTrusted(platform);
  let offers = await accountOffers(platform);
  // Offers change as vaults are synced; read them again now and then.
  const timer = setInterval(() => void accountOffers(platform).then((o) => (offers = o)), 10_000);
  link = new AccountLink({
    network: await deviceNetworkFor(platform, identity.id),
    identity,
    trusted: () => trusted,
    offers: () => offers,
    ask: (device, check) =>
      new Promise<boolean>((resolve) => {
        answer = resolve;
        linkState.setState({ request: { device, check } });
      }),
    waiting: (check) => linkState.setState({ waiting: check }),
    trust: (devices) => {
      const fresh = devices.filter((d) => d.id !== identity.id && !trusted.some((t) => t.id === d.id));
      if (!fresh.length) return;
      trusted = [...trusted, ...fresh];
      void addAccountTrusted(platform, fresh);
      // Both devices asked each other: once one let the other in, the other question is answered.
      const asking = linkState.getState().request;
      if (asking && fresh.some((d) => d.id === asking.device.id)) answerRequest(true);
    },
    offered: (from, list) =>
      void refreshOffers(
        platform,
        list.map((o) => ({ ...o, from: from.name })),
      ),
  });
  const stopLink = link.stop.bind(link);
  link.stop = () => {
    clearInterval(timer);
    stopLink();
  };
  link.start();
  await refreshOffers(platform);
}

function stop() {
  link?.stop();
  link = null;
  answerRequest(false);
  linkState.setState({ waiting: null });
}

/** Follows the account: linked while signed in. */
export function followAccount(platform: Platform): () => void {
  void currentAccount(platform).then((session) => session && start(platform));
  return onAccountChange((session) => (session ? void start(platform) : stop()));
}

/** A vault was received from the account: it leaves the offers. */
export function offersChanged(platform: Platform) {
  return refreshOffers(platform);
}
