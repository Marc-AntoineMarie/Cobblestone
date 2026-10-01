import { loadIdentity, relaySettings, relayUrl, setRelayToken } from './sync';
import type { Platform } from './platform';

/*
 * The user's account on the Cobblestone server (the relay's own server): an
 * e-mail address and a password, to find one's devices from anywhere. Only
 * the session token of this device is kept here; the server never sees a
 * note (they stay encrypted end to end between devices).
 */

const ACCOUNT_KEY = 'account';

export interface AccountSession {
  email: string;
  token: string;
  /** The server it was opened on. */
  server: string;
}

export interface AccountDevice {
  id: string;
  name: string;
  kind: string;
  lastSeen: number;
}

/** Why the server said no; the interface turns it into a sentence. */
export class AccountFailure extends Error {
  constructor(readonly code: string) {
    super(`cobblestone:account-${code}`);
  }
}

const listeners = new Set<(session: AccountSession | null) => void>();

/** The HTTPS address of the server behind the relay set in the settings. */
export async function accountServer(platform: Platform): Promise<string | null> {
  const relay = relayUrl((await relaySettings(platform)).url);
  return relay ? relay.replace(/^ws/i, 'http') : null;
}

export async function currentAccount(platform: Platform): Promise<AccountSession | null> {
  return (await platform.storage.get<AccountSession>(ACCOUNT_KEY)) ?? null;
}

export function onAccountChange(listener: (session: AccountSession | null) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

async function setAccount(platform: Platform, session: AccountSession | null) {
  await platform.storage.set(ACCOUNT_KEY, session);
  setRelayToken(session?.token ?? null);
  listeners.forEach((l) => l(session));
}

async function call<T>(server: string, route: string, body?: unknown, token?: string, method = 'POST'): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${server}/api/${route}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new AccountFailure('offline');
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new AccountFailure(data.error ?? 'server');
  return data;
}

async function serverOrFail(platform: Platform) {
  const server = await accountServer(platform);
  if (!server) throw new AccountFailure('no-server');
  return server;
}

async function thisDevice(platform: Platform) {
  const { id, name, kind, publicKey } = await loadIdentity(platform);
  return { id, name, kind, publicKey };
}

/** Creates the account; a code is sent by e-mail, to give to `verify`. */
export async function signUp(platform: Platform, email: string, password: string) {
  await call(await serverOrFail(platform), 'signup', { email, password });
}

export async function verify(platform: Platform, email: string, code: string) {
  const server = await serverOrFail(platform);
  const { token } = await call<{ token: string }>(server, 'verify', { email, code, device: await thisDevice(platform) });
  await setAccount(platform, { email: email.trim().toLowerCase(), token, server });
}

export async function signIn(platform: Platform, email: string, password: string) {
  const server = await serverOrFail(platform);
  const { token } = await call<{ token: string }>(server, 'login', { email, password, device: await thisDevice(platform) });
  await setAccount(platform, { email: email.trim().toLowerCase(), token, server });
}

export async function forgotPassword(platform: Platform, email: string) {
  await call(await serverOrFail(platform), 'forgot', { email });
}

export async function resetPassword(platform: Platform, email: string, code: string, password: string) {
  await call(await serverOrFail(platform), 'reset', { email, code, password });
}

export async function accountDevices(platform: Platform): Promise<AccountDevice[]> {
  const session = await currentAccount(platform);
  if (!session) return [];
  try {
    return (await call<{ devices: AccountDevice[] }>(session.server, 'me', undefined, session.token, 'GET')).devices;
  } catch (error) {
    // The session ended elsewhere (new password, signed out from another device).
    if (error instanceof AccountFailure && error.code === 'unknown') await setAccount(platform, null);
    throw error;
  }
}

export async function signOutDevice(platform: Platform, deviceId: string) {
  const session = await currentAccount(platform);
  if (session) await call(session.server, `devices/${deviceId}`, undefined, session.token, 'DELETE');
}

export async function signOut(platform: Platform) {
  const session = await currentAccount(platform);
  await setAccount(platform, null);
  if (session) await call(session.server, 'logout', {}, session.token).catch(() => undefined);
}

export async function deleteAccount(platform: Platform, password: string) {
  const session = await currentAccount(platform);
  if (!session) return;
  await call(session.server, 'delete', { password }, session.token);
  await setAccount(platform, null);
}
