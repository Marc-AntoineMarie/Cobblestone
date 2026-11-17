import { describe, expect, it } from 'vitest';
import {
  applyPreset,
  DEFAULT_LAYOUT,
  normalizeLayout,
  setLayoutOption,
  shiftRailTab,
  toggleRailTab,
  type LayoutPreferences,
} from './layout';

describe('layout of the workbench', () => {
  it('starts complete: the list, the margin, tabs once several notes are open', () => {
    expect(DEFAULT_LAYOUT).toMatchObject({ preset: 'complet', list: true, margin: true, tabs: 'several', statusBar: true });
  });

  it('goes from a ready-made layout to another, keeping the width', () => {
    const wide = setLayoutOption(DEFAULT_LAYOUT, 'width', 'wide');
    const focused = applyPreset(wide, 'concentre');
    expect(focused).toMatchObject({ preset: 'concentre', list: false, margin: false, width: 'wide' });
    expect(applyPreset(focused, 'complet')).toMatchObject({ preset: 'complet', list: true, margin: true, width: 'wide' });
  });

  it('becomes custom when a setting leaves its layout, and finds the layout back', () => {
    const without = setLayoutOption(DEFAULT_LAYOUT, 'margin', false);
    expect(without.preset).toBe('custom');
    expect(setLayoutOption(without, 'margin', true).preset).toBe('complet');
    // The width is a matter of taste: it does not make the layout custom.
    expect(setLayoutOption(DEFAULT_LAYOUT, 'width', 'narrow').preset).toBe('complet');
  });

  it('hides and shows a button of the rail, keeping the order', () => {
    const without = toggleRailTab(DEFAULT_LAYOUT, 'outline');
    expect(without.rail).toEqual(['links', 'properties', 'graph']);
    expect(without.preset).toBe('custom');
    expect(toggleRailTab(without, 'outline').rail).toEqual(['links', 'outline', 'properties', 'graph']);
  });

  it('moves a button of the rail, and stops at the ends', () => {
    expect(shiftRailTab(DEFAULT_LAYOUT, 'outline', -1).rail).toEqual(['outline', 'links', 'properties', 'graph']);
    expect(shiftRailTab(DEFAULT_LAYOUT, 'links', -1)).toBe(DEFAULT_LAYOUT);
    expect(shiftRailTab(DEFAULT_LAYOUT, 'graph', 1)).toBe(DEFAULT_LAYOUT);
  });

  it('completes a stored layout, and brings an old one (panels in zones) over', () => {
    expect(normalizeLayout(undefined)).toEqual(DEFAULT_LAYOUT);
    const old = {
      preset: 'focus',
      zones: { search: 'hidden', files: 'hidden', bookmarks: 'hidden', tags: 'hidden', backlinks: 'right', outline: 'right' },
      tabs: false,
      statusBar: false,
      width: 'wide',
    } as unknown as Partial<LayoutPreferences>;
    const brought = normalizeLayout(old);
    expect(brought).toMatchObject({ list: false, margin: true, tabs: 'never', statusBar: false, width: 'wide' });
    expect(brought.rail).toEqual(['links', 'outline', 'properties', 'graph']);
    expect(normalizeLayout({ rail: ['nope'] } as unknown as Partial<LayoutPreferences>).rail).toEqual([
      'links',
      'outline',
      'properties',
      'graph',
    ]);
  });
});
