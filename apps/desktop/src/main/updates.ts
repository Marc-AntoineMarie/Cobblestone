import { app, BrowserWindow, ipcMain } from 'electron';
import updater from 'electron-updater';
import type { UpdateStatus } from '@cobblestone/app';

/*
 * Updates from the GitHub releases: the installed app checks at start and
 * every hour, downloads a newer version in the background, then offers to
 * restart into it. Builds of `main` are pre-releases: an app built from
 * `main` follows them, an app from an official version only follows those.
 */

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available'; version: string }
  | { type: 'downloaded'; version: string }
  | { type: 'error' };

/** What a status becomes after one autoUpdater event; pure, so it's testable without a real autoUpdater. */
export function nextStatus(event: UpdateEvent): UpdateStatus {
  switch (event.type) {
    case 'checking':
      return { kind: 'checking' };
    case 'available':
      return { kind: 'downloading', version: event.version };
    case 'not-available':
      return { kind: 'up-to-date', version: event.version };
    case 'downloaded':
      return { kind: 'ready', version: event.version };
    case 'error':
      return { kind: 'error' };
  }
}

const HOUR = 60 * 60 * 1000;
let status: UpdateStatus = { kind: 'idle' };

function broadcast() {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send('updates:status', status);
}

export function registerUpdates() {
  ipcMain.handle('updates:status', () => status);
  ipcMain.handle('updates:install', () => status.kind === 'ready' && updater.autoUpdater.quitAndInstall());
  if (!app.isPackaged || process.env.COBBLESTONE_NO_UPDATES) {
    ipcMain.handle('updates:check', () => undefined);
    return;
  }
  const { autoUpdater } = updater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  const apply = (event: UpdateEvent) => {
    status = nextStatus(event);
    broadcast();
  };
  autoUpdater.on('checking-for-update', () => apply({ type: 'checking' }));
  autoUpdater.on('update-available', (info) => apply({ type: 'available', version: info.version }));
  autoUpdater.on('update-not-available', (info) => apply({ type: 'not-available', version: info.version }));
  autoUpdater.on('update-downloaded', (info) => apply({ type: 'downloaded', version: info.version }));
  autoUpdater.on('error', (error) => {
    console.error('Update', error);
    apply({ type: 'error' });
  });
  const check = () => void autoUpdater.checkForUpdates().catch(() => undefined);
  ipcMain.handle('updates:check', check);
  check();
  setInterval(check, HOUR).unref();
}
