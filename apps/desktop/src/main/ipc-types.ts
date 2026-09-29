/** Methods of the vault adapter the renderer may call through IPC. */
export const FS_METHODS = ['list', 'stat', 'read', 'readBinary', 'write', 'writeBinary', 'mkdir', 'remove', 'rename'] as const;
export type FsMethod = (typeof FS_METHODS)[number];

export interface DesktopVaultEntry {
  id: string;
  name: string;
  kind: 'folder';
  location: string;
  lastOpened: number;
}
