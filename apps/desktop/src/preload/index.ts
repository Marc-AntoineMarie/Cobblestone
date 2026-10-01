import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

/**
 * The only bridge between the sandboxed renderer and the main process.
 * The renderer never touches Node or the file system directly.
 */
/** Listens to one channel from the main process; returns the function that stops. */
function on<A extends unknown[]>(channel: string, listener: (...args: A) => void) {
  const handler = (_event: IpcRendererEvent, ...args: unknown[]) => listener(...(args as A));
  ipcRenderer.on(channel, handler);
  return () => void ipcRenderer.off(channel, handler);
}

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
  lan: {
    start: (device: string) => ipcRenderer.invoke('lan:start', device) as Promise<void>,
    listen: (tag: string) => ipcRenderer.invoke('lan:listen', tag) as Promise<void>,
    unlisten: (tag: string) => ipcRenderer.invoke('lan:unlisten', tag) as Promise<void>,
    search: () => ipcRenderer.invoke('lan:search') as Promise<void>,
    connect: (address: string, tag: string) => ipcRenderer.invoke('lan:connect', address, tag) as Promise<string>,
    send: (id: string, frame: Uint8Array) => ipcRenderer.send('lan:send', id, frame),
    close: (id: string) => ipcRenderer.invoke('lan:close', id) as Promise<void>,
    onFound: (listener: (tag: string, address: string, device: string) => void) =>
      on('lan:found', (tag: string, address: string, device: string) => listener(tag, address, device)),
    onIncoming: (listener: (id: string, tag: string) => void) =>
      on('lan:incoming', (id: string, tag: string) => listener(id, tag)),
    onFrame: (listener: (id: string, frame: Uint8Array) => void) =>
      on('lan:frame', (id: string, frame: Uint8Array) => listener(id, frame)),
    onClosed: (listener: (id: string) => void) => on('lan:closed', (id: string) => listener(id)),
  },
  updates: {
    /** The version downloaded and ready, if any. */
    ready: () => ipcRenderer.invoke('updates:ready') as Promise<string | null>,
    onReady: (listener: (version: string) => void) => on('updates:ready', (version: string) => listener(version)),
    install: () => ipcRenderer.invoke('updates:install') as Promise<void>,
  },
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  reveal: (vaultId: string, path: string) => ipcRenderer.invoke('shell:reveal', vaultId, path),
  platform: process.platform,
};

contextBridge.exposeInMainWorld('cobblestone', api);

export type DesktopBridge = typeof api;
