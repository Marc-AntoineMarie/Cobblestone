import { app, BrowserWindow, ipcMain } from 'electron';
import updater from 'electron-updater';

/*
 * Updates from the GitHub releases: the installed app checks at start and
 * every hour, downloads a newer version in the background, then offers to
 * restart into it. Builds of `main` are pre-releases: an app built from
 * `main` follows them, an app from an official version only follows those.
 */

const HOUR = 60 * 60 * 1000;
let ready: string | null = null;

export function registerUpdates() {
  ipcMain.handle('updates:ready', () => ready);
  ipcMain.handle('updates:install', () => ready && updater.autoUpdater.quitAndInstall());
  if (!app.isPackaged || process.env.COBBLESTONE_NO_UPDATES) return;
  const { autoUpdater } = updater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', (info) => {
    ready = info.version;
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send('updates:ready', info.version);
  });
  autoUpdater.on('error', (error) => console.error('Update', error));
  const check = () => void autoUpdater.checkForUpdates().catch(() => undefined);
  check();
  setInterval(check, HOUR).unref();
}
