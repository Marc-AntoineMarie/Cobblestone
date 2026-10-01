import { createServer, type IncomingMessage } from 'node:http';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';

/*
 * The relay: devices of a vault that are not on the same network meet here.
 * Each device listens for tags (a hash of a vault's id, or of the start of a
 * pairing code) and watches others; the relay tells it which devices listen
 * for the same tags, and joins two devices in a link. On a link it only
 * passes frames, already encrypted end to end by the devices: it can read
 * nothing of the notes, and keeps nothing.
 *
 * Client → relay (text):  hello {device} · listen/unlisten/watch/unwatch {tag}
 *                         · search · connect {req, to, tag} · close {link}
 * Relay → client (text):  welcome {id} · found {tag, address, device}
 *                         · linked {req, link} · refused {req} · incoming {link, tag} · closed {link}
 * Both ways (binary):     4 bytes of link id, then the frame.
 */

export interface RelayOptions {
  port?: number;
  host?: string;
  maxFrame?: number;
  maxConnectionsPerAddress?: number;
  maxLinksPerClient?: number;
  maxTagsPerClient?: number;
}

interface Client {
  id: number;
  socket: WebSocket;
  address: string;
  device: string;
  listens: Set<string>;
  watches: Set<string>;
  links: Set<number>;
  alive: boolean;
}

const DEFAULTS = {
  port: 8787,
  host: '0.0.0.0',
  maxFrame: 64 * 1024 * 1024,
  maxConnectionsPerAddress: 32,
  maxLinksPerClient: 64,
  maxTagsPerClient: 64,
};

const TAG = /^[a-z0-9-]{1,64}$/;

export async function createRelay(options: RelayOptions = {}) {
  const config = { ...DEFAULTS, ...options };
  const clients = new Map<number, Client>();
  const listeners = new Map<string, Set<number>>();
  const watchers = new Map<string, Set<number>>();
  const links = new Map<number, [number, number]>();
  let nextClient = 1;
  let nextLink = 1;

  const http = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end('Cobblestone relay\n');
  });
  const server = new WebSocketServer({ server: http, maxPayload: config.maxFrame + 4 });

  const send = (client: Client | undefined, message: Record<string, unknown>) => {
    if (client && client.socket.readyState === client.socket.OPEN) client.socket.send(JSON.stringify(message));
  };
  const found = (to: Client, tag: string, about: Client) =>
    send(to, { t: 'found', tag, address: `relay:${about.id}`, device: about.device });
  const set = (map: Map<string, Set<number>>, tag: string) => {
    let ids = map.get(tag);
    if (!ids) map.set(tag, (ids = new Set()));
    return ids;
  };
  const drop = (map: Map<string, Set<number>>, tag: string, id: number) => {
    const ids = map.get(tag);
    ids?.delete(id);
    if (ids && !ids.size) map.delete(tag);
  };

  /** Tells `client` of every other device listening for its tags, and them of it. */
  const introduce = (client: Client, tag: string) => {
    for (const id of listeners.get(tag) ?? []) if (id !== client.id) found(client, tag, clients.get(id)!);
    if (!client.listens.has(tag)) return;
    for (const id of new Set([...(listeners.get(tag) ?? []), ...(watchers.get(tag) ?? [])])) {
      if (id !== client.id) found(clients.get(id)!, tag, client);
    }
  };

  const closeLink = (link: number) => {
    const ends = links.get(link);
    if (!ends) return;
    links.delete(link);
    for (const id of ends) {
      const client = clients.get(id);
      client?.links.delete(link);
      send(client, { t: 'closed', link });
    }
  };

  const onText = (client: Client, message: Record<string, unknown>) => {
    const tag = typeof message.tag === 'string' && TAG.test(message.tag) ? message.tag : null;
    switch (message.t) {
      case 'hello':
        if (typeof message.device === 'string' && /^[0-9a-f]{16}$/.test(message.device)) client.device = message.device;
        return;
      case 'listen':
      case 'watch': {
        const mine = message.t === 'listen' ? client.listens : client.watches;
        if (!tag || mine.size >= config.maxTagsPerClient) return;
        mine.add(tag);
        set(message.t === 'listen' ? listeners : watchers, tag).add(client.id);
        introduce(client, tag);
        return;
      }
      case 'unlisten':
      case 'unwatch':
        if (!tag) return;
        (message.t === 'unlisten' ? client.listens : client.watches).delete(tag);
        drop(message.t === 'unlisten' ? listeners : watchers, tag, client.id);
        return;
      case 'search':
        for (const t of new Set([...client.listens, ...client.watches])) introduce(client, t);
        return;
      case 'connect': {
        const target = clients.get(Number(message.to));
        if (!tag || !target || target === client || !target.listens.has(tag) || client.links.size >= config.maxLinksPerClient) {
          send(client, { t: 'refused', req: message.req });
          return;
        }
        const link = nextLink++;
        links.set(link, [client.id, target.id]);
        client.links.add(link);
        target.links.add(link);
        send(target, { t: 'incoming', link, tag });
        send(client, { t: 'linked', req: message.req, link });
        return;
      }
      case 'close':
        if (client.links.has(Number(message.link))) closeLink(Number(message.link));
        return;
    }
  };

  const onBinary = (client: Client, data: Buffer) => {
    if (data.length < 4) return;
    const link = data.readUInt32BE(0);
    const ends = links.get(link);
    if (!ends || !client.links.has(link)) return;
    const other = clients.get(ends[0] === client.id ? ends[1] : ends[0]);
    if (other?.socket.readyState === other?.socket.OPEN) other!.socket.send(data);
  };

  server.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    const address =
      (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || request.socket.remoteAddress || '';
    if ([...clients.values()].filter((c) => c.address === address).length >= config.maxConnectionsPerAddress) {
      socket.close(1008, 'too many connections');
      return;
    }
    const client: Client = {
      id: nextClient++,
      socket,
      address,
      device: '',
      listens: new Set(),
      watches: new Set(),
      links: new Set(),
      alive: true,
    };
    clients.set(client.id, client);
    send(client, { t: 'welcome', id: client.id });
    socket.on('pong', () => (client.alive = true));
    socket.on('message', (data: RawData, binary: boolean) => {
      const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer);
      if (binary) return onBinary(client, buffer);
      try {
        onText(client, JSON.parse(buffer.toString('utf8')) as Record<string, unknown>);
      } catch {
        // Not a message of ours: ignored.
      }
    });
    socket.on('close', () => {
      clients.delete(client.id);
      for (const tag of client.listens) drop(listeners, tag, client.id);
      for (const tag of client.watches) drop(watchers, tag, client.id);
      for (const link of [...client.links]) closeLink(link);
    });
    socket.on('error', () => socket.terminate());
  });

  // A device that stopped answering (a laptop closed without saying so) is let go.
  const heartbeat = setInterval(() => {
    for (const client of clients.values()) {
      if (!client.alive) client.socket.terminate();
      client.alive = false;
      client.socket.ping();
    }
  }, 30_000);
  heartbeat.unref();

  await new Promise<void>((resolve) => http.listen(config.port, config.host, resolve));
  return {
    port: (http.address() as { port: number }).port,
    clients: () => clients.size,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(heartbeat);
        for (const client of clients.values()) client.socket.terminate();
        server.close();
        http.close(() => resolve());
      }),
  };
}
