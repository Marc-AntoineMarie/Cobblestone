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
    findMoved: (id: string) => ipcRenderer.invoke('vaults:findMoved', id),
    relocate: (id: string, found?: string) => ipcRenderer.invoke('vaults:relocate', id, found),
    onMissing: (listener: (vaultId: string, missing: boolean) => void) => {
      const handler = (_event: IpcRendererEvent, vaultId: string, missing: boolean) => listener(vaultId, missing);
      ipcRenderer.on('vaults:missing', handler);
      return () => void ipcRenderer.off('vaults:missing', handler);
    },
  },
  fs: {
    call: (vaultId: string, method: string, args: unknown[]) => ipcRenderer.invoke('fs:call', vaultId, method, args),
    watch: (vaultId: string, token: string) => ipcRenderer.invoke('fs:watch', vaultId, token),
    unwatch: (vaultId: string, token: string) => ipcRenderer.invoke('fs:unwatch', vaultId, token),
    onEvent: (token: string, listener: (change: unknown) => void) => {
      const handler = (_event: IpcRendererEvent, _vaultId: string, from: string, change: unknown) => {
        if (from === token) listener(change);
      };
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
