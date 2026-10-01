import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Accounts, type Mailer } from './accounts.ts';
import { createRelay } from './relay.ts';

const device = (id: string, name = 'PC') => ({ id: id.padStart(16, '0'), name, kind: 'desktop', publicKey: 'clé' });

let dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), 'cobblestone-accounts-'));
  dirs.push(dir);
  const mails: { to: string; text: string }[] = [];
  const mailer: Mailer = { send: async (to, _subject, text) => void mails.push({ to, text }) };
  const file = path.join(dir, 'accounts.json');
  const accounts = await Accounts.open(file, mailer);
  const code = () => /(\d{6})/.exec(mails.at(-1)!.text)![1]!;
  return { accounts, mails, code, file, mailer };
}

describe('accounts', () => {
  it('sign up with a code by e-mail, then sign in on another device', async () => {
    const { accounts, code } = await setup();
    await accounts.signup(' Lea@Exemple.fr ', 'un mot de passe long', '1.2.3.4');
    await expect(accounts.verify('lea@exemple.fr', '000000', device('a'))).rejects.toMatchObject({ code: 'wrong' });
    const token = await accounts.verify('lea@exemple.fr', code(), device('a'));
    expect(accounts.session(token)).toMatchObject({ email: 'lea@exemple.fr', device: { id: device('a').id } });
    await expect(accounts.login('lea@exemple.fr', 'mauvais mot de passe', device('b'), '1.2.3.4')).rejects.toMatchObject({
      code: 'wrong',
    });
    const second = await accounts.login('LEA@exemple.fr', 'un mot de passe long', device('b', 'Fixe'), '1.2.3.4');
    expect(accounts.devices(second).devices.map((d) => d.name)).toEqual(['PC', 'Fixe']);
  });

  it('keep no password, token or code in clear', async () => {
    const { accounts, code, file } = await setup();
    await accounts.signup('a@b.fr', 'secret très long', 'ip');
    const sent = code();
    const token = await accounts.verify('a@b.fr', sent, device('a'));
    const stored = await readFile(file, 'utf8');
    for (const secret of ['secret très long', token, sent]) expect(stored.includes(secret)).toBe(false);
    expect(stored).toContain('scrypt$');
  });

  it('refuse weak passwords, taken addresses, and slow down guessing', async () => {
    const { accounts, code } = await setup();
    await expect(accounts.signup('a@b.fr', 'court', 'ip')).rejects.toMatchObject({ code: 'weak' });
    await accounts.signup('a@b.fr', 'assez long pour passer', 'ip');
    await accounts.verify('a@b.fr', code(), device('a'));
    await expect(accounts.signup('a@b.fr', 'assez long pour passer', 'ip')).rejects.toMatchObject({ code: 'exists' });
    for (let i = 0; i < 10; i++) await accounts.login('a@b.fr', 'faux faux faux', device('b'), `ip${i}`).catch(() => {});
    await expect(accounts.login('a@b.fr', 'assez long pour passer', device('b'), 'ip-x')).rejects.toMatchObject({
      code: 'slow-down',
    });
  });

  it('give a new password with a code, which signs every device out', async () => {
    const { accounts, code } = await setup();
    await accounts.signup('a@b.fr', 'premier mot de passe', 'ip');
    const token = await accounts.verify('a@b.fr', code(), device('a'));
    await accounts.forgot('a@b.fr', 'ip');
    await accounts.forgot('inconnu@b.fr', 'ip');
    await accounts.reset('a@b.fr', code(), 'second mot de passe');
    expect(accounts.session(token)).toBeNull();
    await expect(accounts.login('a@b.fr', 'second mot de passe', device('a'), 'ip')).resolves.toBeTypeOf('string');
  });

  it('survive a restart of the server', async () => {
    const { accounts, code, file, mailer } = await setup();
    await accounts.signup('a@b.fr', 'mot de passe solide', 'ip');
    const token = await accounts.verify('a@b.fr', code(), device('a'));
    const again = await Accounts.open(file, mailer);
    expect(again.session(token)?.email).toBe('a@b.fr');
  });
});

describe('the relay with accounts', () => {
  it('serves the API, and keeps an account’s devices among themselves', async () => {
    const { accounts, code } = await setup();
    const relay = await createRelay({ port: 0, host: '127.0.0.1', accounts });
    try {
      const api = (route: string, body: unknown, token?: string) =>
        fetch(`http://127.0.0.1:${relay.port}/api/${route}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        });
      expect((await api('signup', { email: 'a@b.fr', password: 'mot de passe solide' })).status).toBe(202);
      const { token } = (await (await api('verify', { email: 'a@b.fr', code: code(), device: device('a') })).json()) as {
        token: string;
      };
      expect((await api('login', { email: 'a@b.fr', password: 'non', device: device('b') })).status).toBe(401);
      const me = await fetch(`http://127.0.0.1:${relay.port}/api/me`, { headers: { authorization: `Bearer ${token}` } });
      expect(((await me.json()) as { email: string }).email).toBe('a@b.fr');

      const open = (id: string, withToken?: string) =>
        new Promise<{ ws: WebSocket; heard: string[] }>((resolve) => {
          const ws = new WebSocket(`ws://127.0.0.1:${relay.port}`);
          const heard: string[] = [];
          ws.onmessage = (e) => heard.push(String(e.data));
          ws.onopen = () => {
            ws.send(JSON.stringify({ t: 'hello', device: id.padStart(16, '0'), token: withToken }));
            resolve({ ws, heard });
          };
        });
      const mine = await open('a', token);
      const stranger = await open('c');
      mine.ws.send(JSON.stringify({ t: 'listen', tag: 'account' }));
      stranger.ws.send(JSON.stringify({ t: 'watch', tag: 'account' }));
      stranger.ws.send(JSON.stringify({ t: 'watch', tag: 'account-of-x' }));
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(mine.heard.some((m) => m.includes('"signedIn":true'))).toBe(true);
      expect(stranger.heard.some((m) => m.includes('found'))).toBe(false);
      mine.ws.close();
      stranger.ws.close();
    } finally {
      await relay.close();
    }
  });
});
