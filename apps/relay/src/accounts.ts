import { createHash, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

/*
 * Accounts: an e-mail address and a password, to find one's devices from
 * anywhere. Nothing here can read a note: notes stay encrypted end to end by
 * the devices, and an account only knows its devices' public keys and names.
 *
 * - Passwords: scrypt (N = 2^15, r = 8, p = 1), a random salt per account;
 *   only the result is kept, compared in constant time.
 * - Sessions: a random token (32 bytes) given once to the device; only its
 *   SHA-256 is kept, so a stolen copy of the file opens no session.
 * - E-mail codes (verification, new password): six digits, kept hashed,
 *   valid 15 minutes, five tries.
 * - Repeated failures from an address or for an account are slowed down.
 * Everything lives in one JSON file, written atomically.
 */

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, length: number, options: object) => Promise<Buffer>;
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const CODE_LIFETIME = 15 * 60_000;
const SESSION_LIFETIME = 365 * 24 * 60 * 60_000;

export interface DeviceInfo {
  id: string;
  name: string;
  kind: string;
  publicKey: string;
}

interface Session {
  hash: string;
  device: DeviceInfo;
  created: number;
  lastSeen: number;
}

interface Code {
  hash: string;
  purpose: 'verify' | 'reset';
  expires: number;
  tries: number;
}

interface Account {
  id: string;
  email: string;
  password: string;
  verified: boolean;
  created: number;
  sessions: Session[];
  code?: Code;
}

export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

type AccountErrorCode = 'invalid' | 'exists' | 'unknown' | 'wrong' | 'unverified' | 'expired' | 'slow-down' | 'weak' | 'mail';

export class AccountError extends Error {
  readonly code: AccountErrorCode;
  constructor(code: AccountErrorCode) {
    super(code);
    this.code = code;
  }
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const normalEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [, n, r, p, salt, key] = stored.split('$');
  const expected = Buffer.from(key!, 'base64');
  const actual = await scrypt(password, Buffer.from(salt!, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return timingSafeEqual(actual, expected);
}

function readDevice(value: unknown): DeviceInfo {
  const d = value as Partial<DeviceInfo> | null;
  const ok =
    typeof d?.id === 'string' &&
    /^[0-9a-f]{16}$/.test(d.id) &&
    typeof d.name === 'string' &&
    d.name.length > 0 &&
    d.name.length <= 80 &&
    typeof d.kind === 'string' &&
    d.kind.length <= 16 &&
    typeof d.publicKey === 'string' &&
    d.publicKey.length <= 64;
  if (!ok) throw new AccountError('invalid');
  return { id: d.id!, name: d.name!, kind: d.kind!, publicKey: d.publicKey! };
}

export class Accounts {
  private accounts = new Map<string, Account>();
  private byToken = new Map<string, { account: Account; session: Session }>();
  private failures = new Map<string, { count: number; until: number }>();
  private writing: Promise<unknown> = Promise.resolve();

  private readonly file: string;
  private readonly mailer: Mailer;

  private constructor(file: string, mailer: Mailer) {
    this.file = file;
    this.mailer = mailer;
  }

  static async open(file: string, mailer: Mailer): Promise<Accounts> {
    const store = new Accounts(file, mailer);
    try {
      const list = JSON.parse(await readFile(file, 'utf8')) as Account[];
      for (const account of list) store.add(account);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    return store;
  }

  private add(account: Account) {
    this.accounts.set(account.email, account);
    for (const session of account.sessions) this.byToken.set(session.hash, { account, session });
  }

  private save() {
    const data = JSON.stringify([...this.accounts.values()]);
    this.writing = this.writing.then(async () => {
      await mkdir(path.dirname(this.file), { recursive: true });
      await writeFile(`${this.file}.tmp`, data, { mode: 0o600 });
      await rename(`${this.file}.tmp`, this.file);
    });
    return this.writing;
  }

  /** Too many failures for this key (an address, an account): wait a while. */
  private guard(key: string) {
    const entry = this.failures.get(key);
    if (entry && entry.until > Date.now()) throw new AccountError('slow-down');
  }

  private failed(key: string) {
    const entry = this.failures.get(key) ?? { count: 0, until: 0 };
    entry.count++;
    if (entry.count >= 10) {
      entry.until = Date.now() + 15 * 60_000;
      entry.count = 0;
    }
    this.failures.set(key, entry);
  }

  private async sendCode(account: Account, purpose: Code['purpose']) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    account.code = { hash: sha256(`${account.email}:${code}`), purpose, expires: Date.now() + CODE_LIFETIME, tries: 0 };
    await this.save();
    const text =
      purpose === 'verify'
        ? `Ton code pour activer ton compte Cobblestone : ${code}\n\nIl est valable 15 minutes. Si tu n'as pas créé de compte, ignore ce message.`
        : `Ton code pour choisir un nouveau mot de passe Cobblestone : ${code}\n\nIl est valable 15 minutes. Si tu n'as rien demandé, ignore ce message : ton mot de passe ne change pas.`;
    try {
      await this.mailer.send(
        account.email,
        purpose === 'verify' ? 'Ton code Cobblestone' : 'Nouveau mot de passe Cobblestone',
        text,
      );
    } catch (error) {
      // Logged for whoever runs the server (wrong SMTP settings…); the device hears that the e-mail did not leave.
      console.error('Mail', error);
      throw new AccountError('mail');
    }
  }

  private takeCode(account: Account, code: unknown, purpose: Code['purpose']) {
    const stored = account.code;
    if (!stored || stored.purpose !== purpose || stored.expires < Date.now() || stored.tries >= 5)
      throw new AccountError('expired');
    stored.tries++;
    const given = Buffer.from(sha256(`${account.email}:${String(code).trim()}`));
    if (!timingSafeEqual(given, Buffer.from(stored.hash))) throw new AccountError('wrong');
    account.code = undefined;
  }

  private openSession(account: Account, device: DeviceInfo): string {
    // One session per device: logging in again replaces the old one.
    for (const old of account.sessions.filter((s) => s.device.id === device.id)) this.byToken.delete(old.hash);
    account.sessions = account.sessions.filter((s) => s.device.id !== device.id);
    const token = randomBytes(32).toString('base64url');
    const session = { hash: sha256(token), device, created: Date.now(), lastSeen: Date.now() };
    account.sessions.push(session);
    this.byToken.set(session.hash, { account, session });
    return token;
  }

  async signup(emailValue: unknown, password: unknown, from: string) {
    this.guard(`ip:${from}`);
    const email = normalEmail(emailValue);
    if (!validEmail(email)) throw new AccountError('invalid');
    if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw new AccountError('weak');
    const existing = this.accounts.get(email);
    if (existing?.verified) {
      this.failed(`ip:${from}`);
      throw new AccountError('exists');
    }
    const account: Account = existing ?? {
      id: randomBytes(12).toString('hex'),
      email,
      password: '',
      verified: false,
      created: Date.now(),
      sessions: [],
    };
    account.password = await hashPassword(password);
    this.accounts.set(email, account);
    await this.sendCode(account, 'verify');
  }

  /** The code from the e-mail activates the account and signs this device in. */
  async verify(emailValue: unknown, code: unknown, deviceValue: unknown): Promise<string> {
    const email = normalEmail(emailValue);
    this.guard(`account:${email}`);
    const account = this.accounts.get(email);
    if (!account) throw new AccountError('unknown');
    const device = readDevice(deviceValue);
    try {
      this.takeCode(account, code, 'verify');
    } catch (error) {
      this.failed(`account:${email}`);
      await this.save();
      throw error;
    }
    account.verified = true;
    const token = this.openSession(account, device);
    await this.save();
    return token;
  }

  async login(emailValue: unknown, password: unknown, deviceValue: unknown, from: string): Promise<string> {
    const email = normalEmail(emailValue);
    this.guard(`ip:${from}`);
    this.guard(`account:${email}`);
    const device = readDevice(deviceValue);
    const account = this.accounts.get(email);
    const ok = account && typeof password === 'string' && (await checkPassword(password, account.password));
    if (!ok || !account) {
      this.failed(`ip:${from}`);
      this.failed(`account:${email}`);
      throw new AccountError('wrong');
    }
    if (!account.verified) {
      await this.sendCode(account, 'verify');
      throw new AccountError('unverified');
    }
    const token = this.openSession(account, device);
    await this.save();
    return token;
  }

  /** Always answers the same, so the address of an account cannot be guessed from here. */
  async forgot(emailValue: unknown, from: string) {
    this.guard(`ip:${from}`);
    this.failed(`ip:${from}`);
    const account = this.accounts.get(normalEmail(emailValue));
    if (account?.verified) await this.sendCode(account, 'reset');
  }

  /** A new password closes every session: each device signs in again. */
  async reset(emailValue: unknown, code: unknown, password: unknown) {
    const email = normalEmail(emailValue);
    this.guard(`account:${email}`);
    const account = this.accounts.get(email);
    if (!account) throw new AccountError('unknown');
    if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw new AccountError('weak');
    try {
      this.takeCode(account, code, 'reset');
    } catch (error) {
      this.failed(`account:${email}`);
      await this.save();
      throw error;
    }
    account.password = await hashPassword(password);
    for (const session of account.sessions) this.byToken.delete(session.hash);
    account.sessions = [];
    await this.save();
  }

  /** The account and device of a session token, or null. */
  session(token: unknown): { account: string; email: string; device: DeviceInfo } | null {
    if (typeof token !== 'string' || !token) return null;
    const found = this.byToken.get(sha256(token));
    if (!found) return null;
    if (found.session.lastSeen + SESSION_LIFETIME < Date.now()) return null;
    found.session.lastSeen = Date.now();
    return { account: found.account.id, email: found.account.email, device: found.session.device };
  }

  devices(token: unknown) {
    const found = typeof token === 'string' ? this.byToken.get(sha256(token)) : undefined;
    if (!found) throw new AccountError('unknown');
    return {
      email: found.account.email,
      devices: found.account.sessions.map((s) => ({ ...s.device, lastSeen: s.lastSeen })),
    };
  }

  /** Signs a device out: this one (logout), or another of the account. */
  async signOut(token: unknown, deviceId?: unknown) {
    const found = typeof token === 'string' ? this.byToken.get(sha256(token)) : undefined;
    if (!found) throw new AccountError('unknown');
    const target = typeof deviceId === 'string' ? deviceId : found.session.device.id;
    for (const s of found.account.sessions.filter((s) => s.device.id === target)) this.byToken.delete(s.hash);
    found.account.sessions = found.account.sessions.filter((s) => s.device.id !== target);
    await this.save();
  }

  /** Deletes the account and all its sessions. */
  async remove(token: unknown, password: unknown) {
    const found = typeof token === 'string' ? this.byToken.get(sha256(token)) : undefined;
    if (!found || typeof password !== 'string' || !(await checkPassword(password, found.account.password))) {
      throw new AccountError('wrong');
    }
    for (const s of found.account.sessions) this.byToken.delete(s.hash);
    this.accounts.delete(found.account.email);
    await this.save();
  }
}
