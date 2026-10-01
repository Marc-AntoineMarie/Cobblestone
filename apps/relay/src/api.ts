import type { IncomingMessage, ServerResponse } from 'node:http';
import { AccountError, type Accounts } from './accounts.ts';

/*
 * The accounts' HTTP API, next to the relay. JSON in and out; the session
 * token goes in the Authorization header. Open to every origin (the web app
 * may be served from anywhere): no cookie is used, so nothing rides along.
 */

const STATUS: Record<AccountError['code'], number> = {
  invalid: 400,
  weak: 400,
  exists: 409,
  unknown: 401,
  wrong: 401,
  unverified: 403,
  expired: 410,
  'slow-down': 429,
};

export function clientAddress(request: IncomingMessage): string {
  return (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || request.socket.remoteAddress || '';
}

async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > 16 * 1024) throw new AccountError('invalid');
    chunks.push(chunk as Buffer);
  }
  if (!size) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    throw new AccountError('invalid');
  }
}

/** Answers /api/… requests; returns false for any other address. */
export async function handleApi(accounts: Accounts, request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  const url = new URL(request.url ?? '/', 'http://relay');
  if (!url.pathname.startsWith('/api/')) return false;
  const reply = (status: number, value: unknown = {}) =>
    response
      .writeHead(status, {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
        'cache-control': 'no-store',
      })
      .end(JSON.stringify(value));
  if (request.method === 'OPTIONS') return (reply(204), true);

  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  const from = clientAddress(request);
  const route = `${request.method} ${url.pathname}`;
  try {
    const data = request.method === 'POST' ? await body(request) : {};
    if (route === 'POST /api/signup') return (await accounts.signup(data.email, data.password, from), reply(202), true);
    if (route === 'POST /api/verify')
      return (reply(200, { token: await accounts.verify(data.email, data.code, data.device) }), true);
    if (route === 'POST /api/login')
      return (reply(200, { token: await accounts.login(data.email, data.password, data.device, from) }), true);
    if (route === 'POST /api/forgot') return (await accounts.forgot(data.email, from), reply(202), true);
    if (route === 'POST /api/reset') return (await accounts.reset(data.email, data.code, data.password), reply(200), true);
    if (route === 'GET /api/me') return (reply(200, accounts.devices(token)), true);
    if (route === 'POST /api/logout') return (await accounts.signOut(token), reply(200), true);
    if (route === 'POST /api/delete') return (await accounts.remove(token, data.password), reply(200), true);
    const device = /^\/api\/devices\/([0-9a-f]{16})$/.exec(url.pathname);
    if (request.method === 'DELETE' && device) return (await accounts.signOut(token, device[1]), reply(200), true);
    return (reply(404, { error: 'not-found' }), true);
  } catch (error) {
    if (error instanceof AccountError) return (reply(STATUS[error.code], { error: error.code }), true);
    console.error('API', error);
    return (reply(500, { error: 'server' }), true);
  }
}
