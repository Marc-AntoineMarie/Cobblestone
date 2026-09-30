import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_THEMES,
  checkContrast,
  completeColors,
  contrast,
  findTheme,
  mix,
  parseHex,
  readThemeFile,
  themeFile,
  themeTokens,
  type Theme,
} from './themes';

const atelier = BUILT_IN_THEMES.find((t) => t.id === 'atelier')!;
const midnight = BUILT_IN_THEMES.find((t) => t.id === 'midnight')!;

describe('themes', () => {
  it('ships eight themes with distinct ids, light and dark', () => {
    expect(BUILT_IN_THEMES).toHaveLength(8);
    expect(new Set(BUILT_IN_THEMES.map((t) => t.id)).size).toBe(8);
    expect(BUILT_IN_THEMES.filter((t) => t.scheme === 'dark').map((t) => t.id)).toEqual(['atelier-night', 'midnight', 'dusk']);
  });

  it('keeps every built-in theme legible', () => {
    for (const theme of BUILT_IN_THEMES) {
      const failing = checkContrast(theme).filter((c) => !c.ok);
      expect(failing, theme.id).toEqual([]);
    }
  });

  it('measures contrast like WCAG', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('reads and mixes colours', () => {
    expect(parseHex('#abc')).toEqual([170, 187, 204]);
    expect(parseHex('red')).toBeNull();
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('derives the roles a theme leaves out', () => {
    const colors = completeColors(midnight);
    expect(colors.paper3).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.ink3).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.paper3).not.toBe(colors.paper2);
  });

  it('leaves the stylesheet alone for Atelier, and sets every ink for the others', () => {
    expect(themeTokens(atelier)).toEqual({});
    const tokens = themeTokens(midnight);
    expect(tokens['--paper']).toBe('#0b0b0e');
    expect(tokens['--accent']).toBe('#8fb3ff');
    expect(tokens['--rule']).toBe('rgb(232 230 225 / 0.11)');
    expect(tokens['--grain']).toContain('feColorMatrix');
  });

  it('applies colours changed in the settings, Atelier included', () => {
    const tokens = themeTokens(atelier, { accent: '#0078bf' });
    expect(tokens['--accent']).toBe('#0078bf');
    expect(tokens['--paper']).toBe('#f4f4f0');
  });

  it('flags a custom theme that is hard to read', () => {
    const faint: Theme = { id: 'faint', scheme: 'light', colors: { ...atelier.colors, ink: '#cccccc' } };
    expect(checkContrast(faint).find((c) => c.pair === 'text')?.ok).toBe(false);
  });

  it('finds a theme by id, custom ones included, or falls back to the default of its paper', () => {
    const mine: Theme = { id: 'custom-1', name: 'Mine', scheme: 'dark', colors: midnight.colors };
    expect(findTheme('custom-1', [mine], 'dark')).toBe(mine);
    expect(findTheme('gone', [], 'dark').id).toBe('atelier-night');
    expect(findTheme('gone', [], 'light').id).toBe('atelier');
  });
});

describe('theme files', () => {
  it('writes a theme and reads it back', () => {
    const kraft = BUILT_IN_THEMES.find((t) => t.id === 'kraft')!;
    const text = themeFile(kraft, 'Mon kraft');
    const back = readThemeFile(text, 'custom-1')!;
    expect(back).toMatchObject({ id: 'custom-1', name: 'Mon kraft', scheme: 'light', noteFont: 'literata' });
    expect(back.colors.paper).toBe('#efe4d0');
    expect(back.colors.paper3).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('refuses what is not a theme, or lacks a colour', () => {
    expect(readThemeFile('not json', 'x')).toBeNull();
    expect(readThemeFile('{"format":"other","scheme":"light","colors":{}}', 'x')).toBeNull();
    const missing = JSON.parse(themeFile(midnight, 'Nuit'));
    delete missing.colors.accent;
    expect(readThemeFile(JSON.stringify(missing), 'x')).toBeNull();
    const bad = JSON.parse(themeFile(midnight, 'Nuit'));
    bad.colors.ink = 'url(javascript:alert(1))';
    expect(readThemeFile(JSON.stringify(bad), 'x')).toBeNull();
  });

  it('keeps a long name short and drops an unknown font', () => {
    const data = JSON.parse(themeFile(midnight, 'x'.repeat(200)));
    data.noteFont = 'comic';
    const back = readThemeFile(JSON.stringify(data), 'x')!;
    expect(back.name).toHaveLength(60);
    expect(back.noteFont).toBeUndefined();
  });
});
