import type { CodeFont, Corners, Density, Preferences, UiFont } from './settings';
import { findTheme, themeTokens, type NoteFont, type Theme } from './themes';

/*
 * What the appearance preferences put on the page: the theme's inks, the fonts,
 * the height of list rows and the roundness of corners, all as CSS custom
 * properties, so the settings' preview can show them on its own element too.
 */

export const UI_FONTS: Record<UiFont, string> = {
  archivo: "'Archivo Variable', Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif",
  atkinson: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif",
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

export const NOTE_FONTS: Record<NoteFont, string> = {
  archivo: UI_FONTS.archivo,
  literata: "'Literata Variable', Literata, Georgia, serif",
  atkinson: UI_FONTS.atkinson,
  'system-sans': UI_FONTS.system,
  'system-serif': "ui-serif, Georgia, 'Times New Roman', serif",
};

export const CODE_FONTS: Record<CodeFont, string> = {
  'commit-mono': "'Commit Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  system: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};

/** Height of a row in lists (file tree, tags, bookmarks, menus), in pixels. */
export const ROW_HEIGHTS: Record<Density, number> = { compact: 24, normal: 28, airy: 34 };

export const RADII: Record<Corners, number> = { square: 0, soft: 3, round: 8 };

export type Paper = 'day' | 'night';

/** The paper in use: the system's when the preference follows it. */
export function paperOf(preferences: Preferences, systemNight: boolean): Paper {
  if (preferences.theme === 'system') return systemNight ? 'night' : 'day';
  return preferences.theme;
}

/** The theme printed on that paper. */
export function themeFor(preferences: Preferences, paper: Paper): Theme {
  return paper === 'night'
    ? findTheme(preferences.nightTheme, preferences.customThemes, 'dark')
    : findTheme(preferences.dayTheme, preferences.customThemes, 'light');
}

/** The font of the notes: chosen in the settings, else the theme's, else the interface's. */
export function noteFontOf(preferences: Preferences, theme: Theme): string {
  if (preferences.noteFont !== 'theme') return NOTE_FONTS[preferences.noteFont];
  return theme.noteFont ? NOTE_FONTS[theme.noteFont] : UI_FONTS[preferences.uiFont];
}

/** Every custom property the appearance sets, for a theme and the preferences. */
export function appearanceTokens(preferences: Preferences, theme: Theme): Record<string, string> {
  return {
    ...themeTokens(theme, preferences.colorOverrides[theme.id]),
    '--font': UI_FONTS[preferences.uiFont],
    '--font-note': noteFontOf(preferences, theme),
    '--mono': CODE_FONTS[preferences.codeFont],
    '--radius': `${RADII[preferences.corners]}px`,
    '--row': `${ROW_HEIGHTS[preferences.density]}px`,
  };
}

/**
 * Sets the tokens on an element, removing those a previous call set and this
 * one does not. Returns the names set, for the next call.
 */
export function applyTokens(element: HTMLElement, tokens: Record<string, string>, previous: string[] = []): string[] {
  for (const name of previous) if (!(name in tokens)) element.style.removeProperty(name);
  for (const [name, value] of Object.entries(tokens)) element.style.setProperty(name, value);
  return Object.keys(tokens);
}
