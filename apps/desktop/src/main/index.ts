import { app, BrowserWindow, dialog, ipcMain, shell, webContents, type IpcMainInvokeEvent } from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeFsAdapter } from '@cobblestone/node';
import { FS_METHODS, type DesktopVaultEntry, type FsMethod } from './ipc-types';
import { JsonFile } from './json-file';
import { forgetLanWindow, registerLan } from './lan-ipc';
import { registerUpdates } from './updates';
import { locationProblem, type LocationProblem } from './locations';
import { findFolder, folderId, searchAreas } from './relocate';

const here = path.dirname(fileURLToPath(import.meta.url));
const devServer = process.env.COBBLESTONE_DEV_SERVER;

app.setName('Cobblestone');
// Tests and portable setups can keep app data elsewhere.
if (process.env.COBBLESTONE_USER_DATA) app.setPath('userData', process.env.COBBLESTONE_USER_DATA);

// ------------------------------------------------------------- app data

const dataFile = (name: string) => path.join(app.getPath('userData'), name);
const vaultList = new JsonFile<DesktopVaultEntry[]>(dataFile('vaults.json'), () => []);
const storage = new JsonFile<Record<string, unknown>>(dataFile('storage.json'), () => ({}));

const recentVaults = () => vaultList.read();

/** Errors the renderer turns into a sentence (see packages/app/src/errors.ts). */
const appError = (code: 'vault-missing' | LocationProblem) => new Error(`cobblestone:${code}`);

/**
 * Refuses folders that cannot be a vault: the app's own data, the home folder or
 * a whole drive, the folder that contained a lost vault, or another vault.
 */
async function checkVaultLocation(location: string, following?: DesktopVaultEntry) {
  const others = (await recentVaults()).filter((v) => v.id !== following?.id).map((v) => v.location);
  const problem = locationProblem(location, {
    home: app.getPath('home'),
    appData: app.getPath('userData'),
    previous: following?.location,
    others: following ? others : undefined,
  });
  if (problem) throw appError(problem);
}

/**
 * Records a vault folder as opened now. With `id`, that entry moves to
 * `location` (its folder was renamed or moved) and keeps its tabs and settings.
 */
async function rememberVault(location: string, id?: string): Promise<DesktopVaultEntry> {
  const identity = await folderId(location);
  let entry: DesktopVaultEntry | undefined;
  await vaultList.update((vaults) => {
    const known = vaults.find((v) => (id ? v.id === id : v.location === location));
    entry = {
      id: known?.id ?? randomUUID(),
      name: known?.location === location ? known.name : path.basename(location),
      kind: 'folder',
      location,
      lastOpened: Date.now(),
      folderId: identity,
    };
    // One entry per folder: following a move replaces an entry already made for the new place.
    return [...vaults.filter((v) => v.id !== entry!.id && v.location !== location), entry];
  });
  return entry!;
}

/** New places found for moved vaults: the renderer may only follow these, or a folder the user picks. */
const foundMoves = new Map<string, string>();

/**
 * Work that must end before the app quits: the last save of a note or of the
 * layout often arrives while the window is closing.
 */
const unfinished = new Set<Promise<unknown>>();

function finishBeforeQuit<T>(work: Promise<T>): Promise<T> {
  unfinished.add(work);
  const done = () => unfinished.delete(work);
  work.then(done, done);
  return work;
}

let waitedForWork = false;
app.on('will-quit', (event) => {
  if (waitedForWork || unfinished.size === 0) return;
  waitedForWork = true;
  event.preventDefault();
  const deadline = new Promise((resolve) => setTimeout(resolve, 5000));
  void Promise.race([Promise.allSettled([...unfinished]), deadline]).then(() => app.quit());
});

// ------------------------------------------------------------- vault access

/** Vaults opened by each window: the renderer can only reach these folders. */
const openVaults = new Map<number, Map<string, NodeFsAdapter>>();
const watchers = new Map<string, () => void>();

function adapterFor(event: IpcMainInvokeEvent, vaultId: string): NodeFsAdapter {
  const adapter = openVaults.get(event.sender.id)?.get(vaultId);
  if (!adapter) throw new Error('Vault is not open in this window');
  return adapter;
}

ipcMain.handle('vaults:recent', async () => {
  const vaults = await recentVaults();
  const ids = new Map(await Promise.all(vaults.map(async (v) => [v.id, await folderId(v.location)] as const)));
  // Entries saved before folder identities existed learn theirs while their folder is in place.
  if (vaults.some((v) => !v.folderId && ids.get(v.id))) {
    await vaultList.update((list) => list.map((v) => (!v.folderId && ids.get(v.id) ? { ...v, folderId: ids.get(v.id) } : v)));
  }
  return vaults.map((v) => ({ ...v, missing: !ids.get(v.id) }));
});

ipcMain.handle('vaults:findMoved', async (_event, id: string) => {
  const entry = (await recentVaults()).find((v) => v.id === id);
  if (!entry?.folderId || (await folderId(entry.location))) return null;
  const location = await findFolder(entry.folderId, searchAreas(entry.location, app.getPath('home')));
  if (!location) return null;
  foundMoves.set(id, location);
  return { name: path.basename(location), location };
});

ipcMain.handle('vaults:relocate', async (event, id: string, found?: string) => {
  const entry = (await recentVaults()).find((v) => v.id === id);
  if (!entry) throw new Error('Unknown vault');
  let location = found && foundMoves.get(id) === found ? found : undefined;
  if (!location) {
    const window = BrowserWindow.fromWebContents(event.sender)!;
    const result = await dialog.showOpenDialog(window, {
      title: `Where is “${entry.name}” now?`,
      defaultPath: path.dirname(entry.location),
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    location = result.filePaths[0];
  }
  await checkVaultLocation(location, entry);
  if (!(await folderId(location))) throw appError('vault-missing');
  foundMoves.delete(id);
  return rememberVault(location, id);
});

ipcMain.handle('vaults:pick', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender)!;
  const result = await dialog.showOpenDialog(window, {
    title: 'Open a folder as a vault',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  await checkVaultLocation(result.filePaths[0]);
  return rememberVault(result.filePaths[0]);
});

ipcMain.handle('vaults:create', async (event, name: string) => {
  const window = BrowserWindow.fromWebContents(event.sender)!;
  const result = await dialog.showOpenDialog(window, {
    title: 'Choose where to create the vault',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const safeName = name.replace(/[\\/:*?"<>|]/g, '').trim() || 'Vault';
  const location = path.join(result.filePaths[0], safeName);
  await checkVaultLocation(location);
  await fs.mkdir(location, { recursive: true });
  return rememberVault(location);
});

ipcMain.handle('vaults:forget', async (_event, id: string) => {
  await vaultList.update((vaults) => vaults.filter((v) => v.id !== id));
});

ipcMain.handle('vaults:open', async (event, id: string) => {
  const entry = (await recentVaults()).find((v) => v.id === id);
  if (!entry) throw new Error('Unknown vault');
  if (!(await fs.stat(entry.location).catch(() => null))?.isDirectory()) throw appError('vault-missing');
  // Entries saved by older versions may point somewhere a vault cannot be.
  await checkVaultLocation(entry.location);
  let windowVaults = openVaults.get(event.sender.id);
  if (!windowVaults) openVaults.set(event.sender.id, (windowVaults = new Map()));
  windowVaults.set(id, new NodeFsAdapter(entry.location, entry.name));
  lostVaults.delete(`${event.sender.id}:${id}`);
  await rememberVault(entry.location);
  return { name: entry.name };
});

ipcMain.handle('fs:call', async (event, vaultId: string, method: FsMethod, args: unknown[]) => {
  if (!FS_METHODS.includes(method)) throw new Error(`Unsupported method ${method}`);
  const adapter = adapterFor(event, vaultId);
  return finishBeforeQuit((adapter[method] as (...a: unknown[]) => Promise<unknown>)(...args));
});

// Each watch has its own token: when a vault reopens, the new session's watch
// starts before the old one stops, and neither may cancel or hear the other.
ipcMain.handle('fs:watch', (event, vaultId: string, token: string) => {
  const key = `${event.sender.id}:${vaultId}:${token}`;
  if (watchers.has(key)) return;
  const sender = event.sender;
  const stop = adapterFor(event, vaultId).watch((change) => {
    if (!sender.isDestroyed()) sender.send('fs:event', vaultId, token, change);
  });
  watchers.set(key, stop);
});

ipcMain.handle('fs:unwatch', (event, vaultId: string, token: string) => {
  const key = `${event.sender.id}:${vaultId}:${token}`;
  watchers.get(key)?.();
  watchers.delete(key);
});

ipcMain.handle('storage:get', async (_event, key: string) => (await storage.read())[key]);

ipcMain.handle('storage:set', async (_event, key: string, value: unknown) => {
  await finishBeforeQuit(storage.update((store) => ({ ...store, [key]: value })));
});

// Only paths inside a vault this window opened: the renderer cannot point anywhere else.
ipcMain.handle('shell:reveal', async (event, vaultId: string, vaultPath: string) => {
  const adapter = adapterFor(event, vaultId);
  const target = adapter.resolve(vaultPath);
  if (target === adapter.root) {
    const failure = await shell.openPath(target);
    if (failure) throw new Error(failure);
  } else {
    await fs.access(target);
    shell.showItemInFolder(target);
  }
});

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (/^(https?|mailto):/i.test(url)) await shell.openExternal(url);
});

registerLan();
registerUpdates();

/** Open vaults whose folder has disappeared, so each window hears it once. */
const lostVaults = new Set<string>();

/** Tells windows when the folder of an open vault is renamed, moved or deleted, and when it comes back. */
async function checkOpenVaults() {
  for (const [senderId, vaults] of openVaults) {
    const contents = webContents.fromId(senderId);
    if (!contents || contents.isDestroyed()) continue;
    for (const [vaultId, adapter] of vaults) {
      const key = `${senderId}:${vaultId}`;
      const missing = !(await folderId(adapter.root));
      if (missing === lostVaults.has(key)) continue;
      if (missing) lostVaults.add(key);
      else lostVaults.delete(key);
      contents.send('vaults:missing', vaultId, missing);
    }
  }
}

// ------------------------------------------------------------- windows

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 480,
    minHeight: 360,
    title: 'Cobblestone',
    // Linux on X11 takes the icon from the window; elsewhere it comes from the installed app.
    icon: process.platform === 'linux' ? path.join(here, '../icon.png') : undefined,
    backgroundColor: '#00000000',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(here, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  window.once('ready-to-show', () => window.show());
  const id = window.webContents.id;
  window.on('closed', () => {
    for (const key of [...watchers.keys()].filter((k) => k.startsWith(`${id}:`))) {
      watchers.get(key)?.();
      watchers.delete(key);
    }
    openVaults.delete(id);
    for (const key of [...lostVaults].filter((k) => k.startsWith(`${id}:`))) lostVaults.delete(key);
    forgetLanWindow(id);
  });
  // Links never navigate the app window: external ones open in the browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (devServer && url.startsWith(devServer)) return;
    event.preventDefault();
  });
  if (devServer) void window.loadURL(devServer);
  else void window.loadFile(path.join(here, '../renderer/index.html'));
}

app.whenReady().then(() => {
  createWindow();
  // Renaming a vault happens in another app: check on the way back, and now and then.
  app.on('browser-window-focus', () => void checkOpenVaults());
  setInterval(() => void checkOpenVaults(), 3000);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
