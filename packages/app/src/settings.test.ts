import { describe, expect, it } from 'vitest';
import { MemoryAdapter } from '@cobblestone/core';
import { DEFAULT_SETTINGS, formatDate, loadVaultSettings, saveVaultSettings } from './settings';

describe('vault settings', () => {
  it('imports an Obsidian configuration once, without touching it', async () => {
    const obsidian = {
      '.obsidian/app.json': JSON.stringify({
        newFileLocation: 'folder',
        newFileFolderPath: 'Inbox',
        attachmentFolderPath: './assets',
        strictLineBreaks: true,
        trashOption: 'none',
        defaultViewMode: 'preview',
      }),
      '.obsidian/daily-notes.json': JSON.stringify({ folder: 'Journal', format: 'DD-MM-YYYY' }),
    };
    const adapter = new MemoryAdapter('v', obsidian);
    const { settings, imported } = await loadVaultSettings(adapter);
    expect(imported).toBe(true);
    expect(settings).toMatchObject({
      newNoteLocation: 'folder',
      newNoteFolder: 'Inbox',
      attachmentLocation: './assets',
      lineBreaks: false,
      trash: 'permanent',
      defaultMode: 'read',
      dailyFolder: 'Journal',
      dailyFormat: 'DD-MM-YYYY',
    });

    await saveVaultSettings(adapter, { ...settings, dailyFolder: 'Days' });
    expect((await loadVaultSettings(adapter)).settings.dailyFolder).toBe('Days');
    expect(await adapter.read('.obsidian/app.json')).toBe(obsidian['.obsidian/app.json']);
  });

  it('falls back to defaults', async () => {
    expect((await loadVaultSettings(new MemoryAdapter())).settings).toEqual(DEFAULT_SETTINGS);
  });

  it('formats daily note dates', () => {
    const date = new Date(2026, 8, 29, 7, 5);
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2026-09-29');
    expect(formatDate(date, 'D/M/YY [at] HH:mm')).toBe('29/9/26 at 07:05');
    expect(formatDate(date, 'dddd D MMMM YYYY', 'fr')).toBe('mardi 29 septembre 2026');
  });
});
