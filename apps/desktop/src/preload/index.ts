import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

/**
 * The only bridge between the sandboxed renderer and the main process.
 * The renderer never touches Node or the file system directly.
 */
const api = {
  vaults: {
    recent: () => ipcRenderer.invoke('vaults:recent'),
    pick: () => ipcRenderer.invoke('vaults:pick'),
    create: (name: string) => ipcRenderer.invoke('vaults:create', name),
    forget: (id: string) => ipcRenderer.invoke('vaults:forget', id),
    open: (id: string) => ipcRenderer.invoke('vaults:open', id),
  },
  fs: {
    call: (vaultId: string, method: string, args: unknown[]) => ipcRenderer.invoke('fs:call', vaultId, method, args),
    watch: (vaultId: string) => ipcRenderer.invoke('fs:watch', vaultId),
    unwatch: (vaultId: string) => ipcRenderer.invoke('fs:unwatch', vaultId),
    onEvent: (listener: (vaultId: string, change: unknown) => void) => {
      const handler = (_event: IpcRendererEvent, vaultId: string, change: unknown) => listener(vaultId, change);
      ipcRenderer.on('fs:event', handler);
      return () => void ipcRenderer.off('fs:event', handler);
    },
  },
  storage: {
    get: (key: string) => ipcRenderer.invoke('storage:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('storage:set', key, value),
  },
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  platform: process.platform,
};

contextBridge.exposeInMainWorld('cobblestone', api);

export type DesktopBridge = typeof api;
