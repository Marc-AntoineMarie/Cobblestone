/** Methods of the vault adapter the renderer may call through IPC. */
export const FS_METHODS = ['list', 'stat', 'read', 'readBinary', 'write', 'writeBinary', 'mkdir', 'remove', 'rename'] as const;
export type FsMethod = (typeof FS_METHODS)[number];

export interface DesktopVaultEntry {
  id: string;
  name: string;
  kind: 'folder';
  location: string;
  lastOpened: number;
  /** Identity of the folder on disk, to find it again after a rename or a move. */
  folderId?: string;
  /** Sent with the recent list: the folder is not where it was. */
  missing?: boolean;
}
