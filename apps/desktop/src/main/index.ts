import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeFsAdapter } from '@cobblestone/node';
import { FS_METHODS, type DesktopVaultEntry, type FsMethod } from './ipc-types';
import { JsonFile } from './json-file';

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
const appError = (code: 'vault-missing' | 'app-data-folder') => new Error(`cobblestone:${code}`);

/** The app's own data folder cannot be a vault: resetting the app would delete the notes. */
function checkVaultLocation(location: string) {
  const inside = path.relative(app.getPath('userData'), location);
  if (!inside.startsWith('..') && !path.isAbsolute(inside)) throw appError('app-data-folder');
}

async function rememberVault(location: string): Promise<DesktopVaultEntry> {
  let entry: DesktopVaultEntry | undefined;
  await vaultList.update((vaults) => {
    const known = vaults.find((v) => v.location === location);
    entry = known
      ? { ...known, lastOpened: Date.now() }
      : { id: randomUUID(), name: path.basename(location), kind: 'folder', location, lastOpened: Date.now() };
    return [...vaults.filter((v) => v.id !== entry!.id), entry];
  });
  return entry!;
}

// ------------------------------------------------------------- vault access

/** Vaults opened by each window: the renderer can only reach these folders. */
const openVaults = new Map<number, Map<string, NodeFsAdapter>>();
const watchers = new Map<string, () => void>();

function adapterFor(event: IpcMainInvokeEvent, vaultId: string): NodeFsAdapter {
  const adapter = openVaults.get(event.sender.id)?.get(vaultId);
  if (!adapter) throw new Error('Vault is not open in this window');
  return adapter;
}

ipcMain.handle('vaults:recent', () => recentVaults());

ipcMain.handle('vaults:pick', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender)!;
  const result = await dialog.showOpenDialog(window, {
    title: 'Open a folder as a vault',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  checkVaultLocation(result.filePaths[0]);
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
  checkVaultLocation(location);
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
  let windowVaults = openVaults.get(event.sender.id);
  if (!windowVaults) openVaults.set(event.sender.id, (windowVaults = new Map()));
  windowVaults.set(id, new NodeFsAdapter(entry.location, entry.name));
  await rememberVault(entry.location);
  return { name: entry.name };
});

ipcMain.handle('fs:call', async (event, vaultId: string, method: FsMethod, args: unknown[]) => {
  if (!FS_METHODS.includes(method)) throw new Error(`Unsupported method ${method}`);
  const adapter = adapterFor(event, vaultId);
  return (adapter[method] as (...a: unknown[]) => Promise<unknown>)(...args);
});

ipcMain.handle('fs:watch', (event, vaultId: string) => {
  const key = `${event.sender.id}:${vaultId}`;
  if (watchers.has(key)) return;
  const sender = event.sender;
  const stop = adapterFor(event, vaultId).watch((change) => {
    if (!sender.isDestroyed()) sender.send('fs:event', vaultId, change);
  });
  watchers.set(key, stop);
});

ipcMain.handle('fs:unwatch', (event, vaultId: string) => {
  const key = `${event.sender.id}:${vaultId}`;
  watchers.get(key)?.();
  watchers.delete(key);
});

ipcMain.handle('storage:get', async (_event, key: string) => (await storage.read())[key]);

ipcMain.handle('storage:set', async (_event, key: string, value: unknown) => {
  await storage.update((store) => ({ ...store, [key]: value }));
});

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (/^(https?|mailto):/i.test(url)) await shell.openExternal(url);
});

// ------------------------------------------------------------- windows

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 480,
    minHeight: 360,
    title: 'Cobblestone',
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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
