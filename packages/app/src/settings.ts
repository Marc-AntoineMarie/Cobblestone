import type { VaultAdapter } from '@cobblestone/core';
import type { EditorMode } from './workspace/workspace';

/** Per-vault settings, stored in ".cobblestone/app.json" inside the vault. */
export interface VaultSettings {
  /** Where new notes go: vault root, the active note's folder, or a fixed folder. */
  newNoteLocation: 'root' | 'current' | 'folder';
  newNoteFolder: string;
  /**
   * Attachment folder with Obsidian's semantics: "/" vault root, "./" the
   * note's folder, "./sub" a subfolder of it, anything else a vault folder.
   */
  attachmentLocation: string;
  updateLinks: boolean;
  lineBreaks: boolean;
  readableLength: boolean;
  spellcheck: boolean;
  trash: 'vault' | 'permanent';
  defaultMode: EditorMode;
  dailyFolder: string;
  /** Date format with YYYY, MM, DD, ddd, dddd, MMM, MMMM tokens. */
  dailyFormat: string;
  dailyTemplate: string;
  /** Templates folder; empty means a folder named "Templates" or "Modèles". */
  templatesFolder: string;
  templateDateFormat: string;
  templateTimeFormat: string;
}

export const DEFAULT_SETTINGS: VaultSettings = {
  newNoteLocation: 'root',
  newNoteFolder: '',
  attachmentLocation: '/',
  updateLinks: true,
  lineBreaks: true,
  readableLength: true,
  spellcheck: true,
  trash: 'vault',
  defaultMode: 'live',
  dailyFolder: '',
  dailyFormat: 'YYYY-MM-DD',
  dailyTemplate: '',
  templatesFolder: '',
  templateDateFormat: 'YYYY-MM-DD',
  templateTimeFormat: 'HH:mm',
};

/** App-wide preferences, stored by the platform (not in the vault). */
export interface Preferences {
  theme: 'system' | 'day' | 'night';
  language: 'auto' | 'en' | 'fr';
}

export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', language: 'auto' };

const SETTINGS_PATH = '.cobblestone/app.json';

async function readJson(adapter: VaultAdapter, path: string): Promise<Record<string, unknown> | null> {
  // Most vaults lack some of these files: check first rather than fail (the desktop app logs every failed read).
  if ((await adapter.stat(path))?.type !== 'file') return null;
  try {
    const value: unknown = JSON.parse(await adapter.read(path));
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Loads the vault's settings. A vault opened for the first time inherits
 * what it can from its Obsidian configuration, which is never modified.
 */
export async function loadVaultSettings(adapter: VaultAdapter): Promise<{ settings: VaultSettings; imported: boolean }> {
  const own = await readJson(adapter, SETTINGS_PATH);
  if (own) return { settings: { ...DEFAULT_SETTINGS, ...(own as Partial<VaultSettings>) }, imported: false };
  const imported = await importObsidianSettings(adapter);
  return { settings: { ...DEFAULT_SETTINGS, ...imported }, imported: Object.keys(imported).length > 0 };
}

export async function saveVaultSettings(adapter: VaultAdapter, settings: VaultSettings): Promise<void> {
  await adapter.mkdir('.cobblestone');
  await adapter.write(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export async function importObsidianSettings(adapter: VaultAdapter): Promise<Partial<VaultSettings>> {
  const out: Partial<VaultSettings> = {};
  const app = await readJson(adapter, '.obsidian/app.json');
  if (app) {
    const str = (key: string) => (typeof app[key] === 'string' ? (app[key] as string) : undefined);
    const bool = (key: string) => (typeof app[key] === 'boolean' ? (app[key] as boolean) : undefined);
    const location = str('newFileLocation');
    if (location === 'root' || location === 'current' || location === 'folder') out.newNoteLocation = location;
    if (str('newFileFolderPath') !== undefined) out.newNoteFolder = str('newFileFolderPath')!;
    if (str('attachmentFolderPath') !== undefined) out.attachmentLocation = str('attachmentFolderPath')!;
    if (bool('alwaysUpdateLinks') !== undefined) out.updateLinks = bool('alwaysUpdateLinks')!;
    if (bool('strictLineBreaks') !== undefined) out.lineBreaks = !bool('strictLineBreaks');
    if (bool('readableLineLength') !== undefined) out.readableLength = bool('readableLineLength')!;
    if (bool('spellcheck') !== undefined) out.spellcheck = bool('spellcheck')!;
    const trash = str('trashOption');
    if (trash === 'none') out.trash = 'permanent';
    else if (trash === 'local' || trash === 'system') out.trash = 'vault';
    if (str('defaultViewMode') === 'preview') out.defaultMode = 'read';
    else if (bool('livePreview') === false) out.defaultMode = 'source';
  }
  const daily = await readJson(adapter, '.obsidian/daily-notes.json');
  if (daily) {
    if (typeof daily.folder === 'string') out.dailyFolder = daily.folder;
    if (typeof daily.format === 'string' && daily.format) out.dailyFormat = daily.format;
    if (typeof daily.template === 'string') out.dailyTemplate = daily.template;
  }
  const templates = await readJson(adapter, '.obsidian/templates.json');
  if (templates) {
    if (typeof templates.folder === 'string') out.templatesFolder = templates.folder;
    if (typeof templates.dateFormat === 'string' && templates.dateFormat) out.templateDateFormat = templates.dateFormat;
    if (typeof templates.timeFormat === 'string' && templates.timeFormat) out.templateTimeFormat = templates.timeFormat;
  }
  return out;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Formats a date with the common Moment.js tokens used by daily notes. */
export function formatDate(date: Date, format: string, locale = 'en'): string {
  const tokens: Record<string, () => string> = {
    YYYY: () => String(date.getFullYear()),
    YY: () => String(date.getFullYear()).slice(-2),
    MMMM: () => date.toLocaleDateString(locale, { month: 'long' }),
    MMM: () => date.toLocaleDateString(locale, { month: 'short' }),
    MM: () => pad(date.getMonth() + 1),
    M: () => String(date.getMonth() + 1),
    DD: () => pad(date.getDate()),
    D: () => String(date.getDate()),
    dddd: () => date.toLocaleDateString(locale, { weekday: 'long' }),
    ddd: () => date.toLocaleDateString(locale, { weekday: 'short' }),
    HH: () => pad(date.getHours()),
    mm: () => pad(date.getMinutes()),
    ss: () => pad(date.getSeconds()),
  };
  // Text in [brackets] is literal, as in Moment.js.
  return format.replace(/\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|mm|ss/g, (match, literal: string | undefined) =>
    literal !== undefined ? literal : tokens[match]!(),
  );
}
