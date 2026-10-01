import { randomUUID } from 'node:crypto';
import { ipcMain, webContents } from 'electron';
import { LanNetwork, type LanLink } from './lan';

/*
 * The local network, lent to the windows: each window finds devices, listens
 * for its vaults' tags and gets the links meant for them. A window reaches
 * only the links it made or received, and connects only to devices that
 * announced themselves.
 */

const lan = new LanNetwork(process.env.COBBLESTONE_LAN_PORT ? { port: Number(process.env.COBBLESTONE_LAN_PORT) } : {});
let starting: Promise<void> | null = null;
/** Windows that use the network, and the tags each listens for. */
const windows = new Map<number, Map<string, () => void>>();
const links = new Map<string, { link: LanLink; owner: number }>();
/** Addresses heard in announcements: the only ones a window may connect to. */
const announced = new Set<string>();

function tell(owner: number, channel: string, ...args: unknown[]) {
  const contents = webContents.fromId(owner);
  if (contents && !contents.isDestroyed()) contents.send(channel, ...args);
}

function adopt(link: LanLink, owner: number, id: string = randomUUID()): string {
  links.set(id, { link, owner });
  link.onFrame((frame) => tell(owner, 'lan:frame', id, frame));
  link.onClose(() => {
    links.delete(id);
    tell(owner, 'lan:closed', id);
  });
  return id;
}

const tagsOf = (owner: number) => {
  let tags = windows.get(owner);
  if (!tags) windows.set(owner, (tags = new Map()));
  return tags;
};

export function registerLan() {
  lan.onFound((tag, address, device) => {
    announced.add(address);
    for (const owner of windows.keys()) tell(owner, 'lan:found', tag, address, device);
  });
  lan.onIncoming((link, tag) => {
    const owner = [...windows].find(([, tags]) => tags.has(tag))?.[0];
    if (owner === undefined) return link.close();
    const id = randomUUID();
    // The window learns of the link before its frames.
    tell(owner, 'lan:incoming', id, tag);
    adopt(link, owner, id);
  });

  ipcMain.handle('lan:start', async (event, device: unknown) => {
    if (typeof device !== 'string' || !/^[0-9a-f]{16}$/.test(device)) throw new Error('Invalid device id');
    lan.device = device;
    tagsOf(event.sender.id);
    // Tests of the relay cut the local network, to be sure the devices meet over the Internet.
    if (process.env.COBBLESTONE_LAN_OFF) return;
    await (starting ??= lan.start());
  });

  ipcMain.handle('lan:listen', (event, tag: unknown) => {
    if (typeof tag !== 'string' || tag.length > 64) throw new Error('Invalid tag');
    const tags = tagsOf(event.sender.id);
    if (!tags.has(tag)) tags.set(tag, lan.listen(tag));
  });

  ipcMain.handle('lan:unlisten', (event, tag: string) => {
    const tags = windows.get(event.sender.id);
    tags?.get(tag)?.();
    tags?.delete(tag);
  });

  ipcMain.handle('lan:search', () => lan.search());

  ipcMain.handle('lan:connect', async (event, address: unknown, tag: unknown) => {
    if (typeof address !== 'string' || !announced.has(address)) throw new Error('Unknown device address');
    if (typeof tag !== 'string' || tag.length > 64) throw new Error('Invalid tag');
    return adopt(await lan.connect(address, tag), event.sender.id);
  });

  ipcMain.on('lan:send', (event, id: string, frame: unknown) => {
    const entry = links.get(id);
    if (entry?.owner === event.sender.id && frame instanceof Uint8Array) entry.link.send(frame);
  });

  ipcMain.handle('lan:close', (event, id: string) => {
    const entry = links.get(id);
    if (entry?.owner === event.sender.id) entry.link.close();
  });
}

/** A window closed: its announcements and links end with it. */
export function forgetLanWindow(owner: number) {
  windows.get(owner)?.forEach((unlisten) => unlisten());
  windows.delete(owner);
  for (const { link, owner: of } of [...links.values()]) if (of === owner) link.close();
}
