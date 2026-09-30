import { describe, expect, it } from 'vitest';
import { appearanceTokens, applyTokens, NOTE_FONTS, noteFontOf, paperOf, themeFor, UI_FONTS } from './appearance';
import { DEFAULT_PREFERENCES, type Preferences } from './settings';
import { BUILT_IN_THEMES } from './themes';

const prefs = (patch: Partial<Preferences> = {}): Preferences => ({ ...DEFAULT_PREFERENCES, ...patch });
const theme = (id: string) => BUILT_IN_THEMES.find((t) => t.id === id)!;

describe('appearance', () => {
  it('follows the system paper, or keeps the one chosen', () => {
    expect(paperOf(prefs(), true)).toBe('night');
    expect(paperOf(prefs(), false)).toBe('day');
    expect(paperOf(prefs({ theme: 'day' }), true)).toBe('day');
    expect(paperOf(prefs({ theme: 'night' }), false)).toBe('night');
  });

  it('prints the day theme on day paper and the night theme on night paper', () => {
    const p = prefs({ dayTheme: 'kraft', nightTheme: 'midnight' });
    expect(themeFor(p, 'day').id).toBe('kraft');
    expect(themeFor(p, 'night').id).toBe('midnight');
    expect(themeFor(prefs({ nightTheme: 'deleted' }), 'night').id).toBe('atelier-night');
  });

  it("uses the chosen note font, else the theme's, else the interface's", () => {
    expect(noteFontOf(prefs(), theme('paper'))).toBe(NOTE_FONTS.literata);
    expect(noteFontOf(prefs({ uiFont: 'atkinson' }), theme('atelier'))).toBe(UI_FONTS.atkinson);
    expect(noteFontOf(prefs({ noteFont: 'system-serif' }), theme('paper'))).toBe(NOTE_FONTS['system-serif']);
  });

  it('sets fonts, row height and corners along with the theme', () => {
    const tokens = appearanceTokens(prefs({ density: 'airy', corners: 'square', codeFont: 'system' }), theme('forest'));
    expect(tokens).toMatchObject({ '--row': '34px', '--radius': '0px', '--paper': '#f1f4ef' });
    expect(tokens['--mono']).toContain('ui-monospace');
    expect(appearanceTokens(prefs(), theme('atelier'))).toMatchObject({ '--row': '28px', '--radius': '3px' });
  });

  it('removes the properties a previous theme set and this one does not', () => {
    const set = new Map<string, string>();
    const element = {
      style: {
        setProperty: (name: string, value: string) => set.set(name, value),
        removeProperty: (name: string) => set.delete(name),
      },
    } as unknown as HTMLElement;
    const first = applyTokens(element, appearanceTokens(prefs(), theme('midnight')));
    expect(set.get('--paper')).toBe('#0b0b0e');
    applyTokens(element, appearanceTokens(prefs(), theme('atelier')), first);
    expect(set.has('--paper')).toBe(false);
    expect(set.get('--row')).toBe('28px');
  });
});
