/*
 * Themes: the colours of each role of the interface, plus the font of the notes.
 * A theme gives a few roles; every ink the stylesheets use is derived from them,
 * so a theme made in the settings is as complete as the built-in ones.
 */

export type ThemeScheme = 'light' | 'dark';

/** The roles a theme sets. The others (rules, hover, overprint…) are derived. */
export interface ThemeColors {
  /** The sheet the notes are written on. */
  paper: string;
  /** Surfaces around it: sidebars, bars. */
  paper2: string;
  /** Wells and hovered rows. Derived when absent. */
  paper3?: string;
  /** Text. */
  ink: string;
  /** Secondary text. */
  ink2: string;
  /** Hints and quiet labels. Derived when absent. */
  ink3?: string;
  /** Actions, links, focus. */
  accent: string;
  /** Text printed on the accent. */
  onAccent: string;
  /** Highlights and the selected row. */
  mark: string;
  /** Text printed on the highlight. */
  markInk: string;
}

export type ColorRole = keyof ThemeColors;

export const COLOR_ROLES: ColorRole[] = [
  'paper',
  'paper2',
  'paper3',
  'ink',
  'ink2',
  'ink3',
  'accent',
  'onAccent',
  'mark',
  'markInk',
];

export type NoteFont = 'archivo' | 'literata' | 'atkinson' | 'system-sans' | 'system-serif';

export interface Theme {
  id: string;
  /** A built-in theme's name comes from the translations; a custom theme carries its own. */
  name?: string;
  scheme: ThemeScheme;
  colors: ThemeColors;
  noteFont?: NoteFont;
  /**
   * Built-in themes whose every token is written out in tokens.css (Atelier by
   * day and by night): nothing to set, the stylesheet already holds them.
   */
  native?: boolean;
}

export const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'atelier',
    scheme: 'light',
    native: true,
    colors: {
      paper: '#f4f4f0',
      paper2: '#ebebe4',
      paper3: '#e1e1d8',
      ink: '#1e2a4f',
      ink2: '#4b5575',
      ink3: '#6e7797',
      accent: '#ff48b0',
      onAccent: '#1e2a4f',
      mark: '#ffe800',
      markInk: '#1e2a4f',
    },
  },
  {
    id: 'atelier-night',
    scheme: 'dark',
    native: true,
    colors: {
      paper: '#15192a',
      paper2: '#1b2034',
      paper3: '#252b45',
      ink: '#ecebe4',
      ink2: '#a3a9c0',
      ink3: '#7d849e',
      accent: '#ff5cba',
      onAccent: '#15192a',
      mark: '#5c5433',
      markInk: '#fff6c4',
    },
  },
  {
    id: 'paper',
    scheme: 'light',
    noteFont: 'literata',
    colors: {
      paper: '#fbfaf7',
      paper2: '#f0eee8',
      ink: '#22201c',
      ink2: '#5f5a51',
      accent: '#2f5d8a',
      onAccent: '#ffffff',
      mark: '#fce9a8',
      markInk: '#22201c',
    },
  },
  {
    id: 'kraft',
    scheme: 'light',
    noteFont: 'literata',
    colors: {
      paper: '#efe4d0',
      paper2: '#e4d5ba',
      ink: '#3b2a1a',
      ink2: '#5e4833',
      accent: '#a8431a',
      onAccent: '#ffffff',
      mark: '#f3c969',
      markInk: '#3b2a1a',
    },
  },
  {
    id: 'forest',
    scheme: 'light',
    colors: {
      paper: '#f1f4ef',
      paper2: '#e2e9de',
      ink: '#1f2d24',
      ink2: '#46564c',
      accent: '#2e7d4f',
      onAccent: '#ffffff',
      mark: '#e6f3a0',
      markInk: '#1f2d24',
    },
  },
  {
    id: 'midnight',
    scheme: 'dark',
    colors: {
      paper: '#0b0b0e',
      paper2: '#17171d',
      ink: '#e8e6e1',
      ink2: '#a09ea8',
      accent: '#8fb3ff',
      onAccent: '#0b0b0e',
      mark: '#4a4420',
      markInk: '#f5efc8',
    },
  },
  {
    id: 'dusk',
    scheme: 'dark',
    noteFont: 'literata',
    colors: {
      paper: '#1e1b24',
      paper2: '#2a2531',
      ink: '#ede6f2',
      ink2: '#b3a9bd',
      accent: '#ff8a5b',
      onAccent: '#1e1b24',
      mark: '#5c4a26',
      markInk: '#fbebd0',
    },
  },
  {
    id: 'contrast',
    scheme: 'light',
    noteFont: 'atkinson',
    colors: {
      paper: '#ffffff',
      paper2: '#ededed',
      paper3: '#dadada',
      ink: '#000000',
      ink2: '#262626',
      ink3: '#474747',
      accent: '#0038d9',
      onAccent: '#ffffff',
      mark: '#ffef00',
      markInk: '#000000',
    },
  },
];

export const DEFAULT_DAY_THEME = 'atelier';
export const DEFAULT_NIGHT_THEME = 'atelier-night';

// ------------------------------------------------------------ colours

type Rgb = [number, number, number];

export function parseHex(color: string): Rgb | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const hex = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

export function toHex([r, g, b]: Rgb): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.min(255, Math.max(0, v)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/** `a` moved towards `b` by `amount` (0 to 1). */
export function mix(a: string, b: string, amount: number): string {
  const x = parseHex(a) ?? [0, 0, 0];
  const y = parseHex(b) ?? [0, 0, 0];
  return toHex(x.map((v, i) => v + (y[i]! - v) * amount) as Rgb);
}

const rgbList = (color: string) => (parseHex(color) ?? [0, 0, 0]).join(' ');

function luminance(color: string): number {
  const [r, g, b] = (parseHex(color) ?? [0, 0, 0]).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** The roles a theme leaves out, filled in. */
export function completeColors(theme: Theme): Required<ThemeColors> {
  const c = theme.colors;
  const dark = theme.scheme === 'dark';
  return {
    ...c,
    paper3: c.paper3 ?? mix(c.paper2, c.ink, dark ? 0.08 : 0.06),
    ink3: c.ink3 ?? mix(c.ink2, c.paper, dark ? 0.22 : 0.18),
  };
}

// ------------------------------------------------------------ legibility

export interface ContrastCheck {
  /** Translation key of the pair. */
  pair: 'text' | 'secondary' | 'surface' | 'hint' | 'accent' | 'mark';
  ratio: number;
  /** The ratio the pair needs: 4.5 for text, 3 for hints. */
  needed: number;
  ok: boolean;
}

/** Contrast of the pairs a reader depends on: text on its backgrounds, and what is printed on the accent and highlight. */
export function checkContrast(theme: Theme): ContrastCheck[] {
  const c = completeColors(theme);
  const pairs: [ContrastCheck['pair'], string, string, number][] = [
    ['text', c.ink, c.paper, 4.5],
    ['secondary', c.ink2, c.paper, 4.5],
    ['surface', c.ink2, c.paper2, 4.5],
    ['hint', c.ink3, c.paper, 3],
    ['accent', c.onAccent, c.accent, 4.5],
    ['mark', c.markInk, c.mark, 4.5],
  ];
  return pairs.map(([pair, fg, bg, needed]) => {
    const ratio = contrast(fg, bg);
    return { pair, ratio, needed, ok: ratio >= needed - 0.005 };
  });
}

// ------------------------------------------------------------ tokens

function grain(ink: string, dark: boolean): string {
  const [r, g, b] = (parseHex(ink) ?? [0, 0, 0]).map((v) => (v / 255).toFixed(2));
  const alpha = dark ? 0.035 : 0.055;
  return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${alpha} 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;
}

/**
 * The CSS custom properties a theme sets on the page, with `overrides` (the
 * colours changed in the settings) applied. A native theme without overrides
 * sets none: tokens.css already holds its values.
 */
export function themeTokens(theme: Theme, overrides: Partial<ThemeColors> = {}): Record<string, string> {
  const changed = Object.keys(overrides).length > 0;
  if (theme.native && !changed) return {};
  const t: Theme = { ...theme, colors: { ...theme.colors, ...overrides } };
  const c = completeColors(t);
  const dark = t.scheme === 'dark';
  return {
    '--paper': c.paper,
    '--paper-2': c.paper2,
    '--paper-3': c.paper3,
    '--ink': c.ink,
    '--ink-2': c.ink2,
    '--ink-3': c.ink3,
    '--rule': `rgb(${rgbList(c.ink)} / ${dark ? 0.11 : 0.14})`,
    '--rule-strong': `rgb(${rgbList(c.ink)} / ${dark ? 0.24 : 0.28})`,
    '--accent': c.accent,
    '--accent-deep': dark ? mix(c.accent, '#ffffff', 0.25) : mix(c.accent, c.ink, 0.3),
    '--on-accent': c.onAccent,
    '--accent-overprint': `rgb(${rgbList(c.accent)} / ${dark ? 0.3 : 0.34})`,
    '--mark': c.mark,
    '--mark-ink': c.markInk,
    '--selected': c.mark,
    '--selected-ink': c.markInk,
    '--hover': c.paper3,
    '--plate': c.ink,
    '--on-plate': c.paper,
    '--grain': grain(c.ink, dark),
  };
}

/** A theme by id among the built-in and custom ones; the default of its scheme when unknown. */
export function findTheme(id: string, custom: Theme[], scheme: ThemeScheme): Theme {
  return (
    [...BUILT_IN_THEMES, ...custom].find((t) => t.id === id) ??
    BUILT_IN_THEMES.find((t) => t.id === (scheme === 'dark' ? DEFAULT_NIGHT_THEME : DEFAULT_DAY_THEME))!
  );
}
