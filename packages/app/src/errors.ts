import { t, type MessageKey } from './i18n';

/*
 * Errors reach the interface from the file system, the browser or the desktop
 * main process (whose messages Electron wraps in "Error invoking remote
 * method …"). They are shown as a short sentence, never as a raw stack line.
 */

/** Errors the desktop main process raises on purpose, as "cobblestone:<code>". */
const APP_CODES = {
  'vault-missing': 'error.vaultMissing',
  'app-data-folder': 'error.appDataFolder',
} as const satisfies Record<string, MessageKey>;

/** System error codes (Node) and DOMException names (browsers). */
const SYSTEM_CODES: Record<string, MessageKey> = {
  ENOENT: 'error.notFound',
  NotFoundError: 'error.notFound',
  EACCES: 'error.permission',
  EPERM: 'error.permission',
  NotAllowedError: 'error.permission',
  SecurityError: 'error.permission',
  ENOSPC: 'error.diskFull',
  QuotaExceededError: 'error.diskFull',
  EROFS: 'error.readOnly',
  NoModificationAllowedError: 'error.readOnly',
  EBUSY: 'error.busy',
  ENAMETOOLONG: 'error.nameTooLong',
};

export type AppErrorCode = keyof typeof APP_CODES;

/** The message without Electron's IPC wrapper and "Error:" prefixes. */
function rawMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^Error invoking remote method '[^']*': /, '').replace(/^(\w*Error: )+/, '');
}

/** The code the desktop main process attached to this error, if any. */
export function appErrorCode(error: unknown): AppErrorCode | null {
  const match = /cobblestone:([\w-]+)/.exec(rawMessage(error));
  return match && match[1]! in APP_CODES ? (match[1] as AppErrorCode) : null;
}

/** True when a vault's folder is gone: renamed, moved or deleted outside the app. */
export function isVaultMissing(error: unknown): boolean {
  return appErrorCode(error) === 'vault-missing' || (error instanceof DOMException && error.name === 'NotFoundError');
}

/** A short sentence for the interface. */
export function describeError(error: unknown): string {
  const app = appErrorCode(error);
  if (app) return t(APP_CODES[app]);
  const name = error instanceof DOMException ? error.name : undefined;
  const code = (error as { code?: unknown } | null)?.code;
  const raw = rawMessage(error);
  const system = name ?? (typeof code === 'string' ? code : /\b(E[A-Z]{3,})\b/.exec(raw)?.[1]);
  if (system && system in SYSTEM_CODES) return t(SYSTEM_CODES[system]!);
  return raw;
}
