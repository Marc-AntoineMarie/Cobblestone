import { describe, expect, it } from 'vitest';
import {
  applyPreset,
  DEFAULT_LAYOUT,
  movePanel,
  normalizeLayout,
  panelsIn,
  PANELS,
  PRESETS,
  setLayoutOption,
  shiftPanel,
} from './layout';

describe('layout', () => {
  it('starts classic: finding and files on the left, the note’s context on the right', () => {
    expect(panelsIn(DEFAULT_LAYOUT, 'left')).toEqual(['search', 'bookmarks', 'files', 'tags']);
    expect(panelsIn(DEFAULT_LAYOUT, 'right')).toEqual(['backlinks', 'outline', 'outgoing', 'properties']);
    expect(panelsIn(DEFAULT_LAYOUT, 'hidden')).toEqual([]);
  });

  it('places every panel in every preset', () => {
    for (const preset of Object.values(PRESETS)) {
      expect(Object.keys(preset.zones).sort()).toEqual([...PANELS].sort());
      expect([...preset.order].sort()).toEqual([...PANELS].sort());
    }
    const mirror = applyPreset(DEFAULT_LAYOUT, 'mirror');
    expect(panelsIn(mirror, 'left')).toEqual(panelsIn(DEFAULT_LAYOUT, 'right'));
    const focus = applyPreset({ ...DEFAULT_LAYOUT, width: 'wide' }, 'focus');
    expect(panelsIn(focus, 'hidden')).toHaveLength(PANELS.length);
    expect(focus).toMatchObject({ tabs: false, statusBar: false, width: 'wide' });
  });

  it('moves a panel to another zone, before another panel or at the end', () => {
    const moved = movePanel(DEFAULT_LAYOUT, 'tags', 'right', 'outline');
    expect(panelsIn(moved, 'right')).toEqual(['backlinks', 'tags', 'outline', 'outgoing', 'properties']);
    expect(panelsIn(moved, 'left')).toEqual(['search', 'bookmarks', 'files']);
    expect(moved.preset).toBe('custom');
    const atEnd = movePanel(DEFAULT_LAYOUT, 'search', 'right');
    expect(panelsIn(atEnd, 'right').at(-1)).toBe('search');
    const hidden = movePanel(DEFAULT_LAYOUT, 'properties', 'hidden');
    expect(panelsIn(hidden, 'hidden')).toEqual(['properties']);
  });

  it('moves a panel up or down among its neighbours only', () => {
    const down = shiftPanel(DEFAULT_LAYOUT, 'search', 1);
    expect(panelsIn(down, 'left')).toEqual(['bookmarks', 'search', 'files', 'tags']);
    expect(shiftPanel(DEFAULT_LAYOUT, 'search', -1)).toBe(DEFAULT_LAYOUT);
    expect(shiftPanel(DEFAULT_LAYOUT, 'tags', 1)).toBe(DEFAULT_LAYOUT);
  });

  it('keeps a preset for the width, and makes it custom for the rest', () => {
    expect(setLayoutOption(DEFAULT_LAYOUT, 'width', 'wide').preset).toBe('classic');
    expect(setLayoutOption(DEFAULT_LAYOUT, 'statusBar', false).preset).toBe('custom');
    expect(setLayoutOption(DEFAULT_LAYOUT, 'tabs', true).preset).toBe('classic');
  });

  it('completes a stored layout that misses panels or holds unknown ones', () => {
    const stored = { preset: 'custom' as const, zones: { files: 'right' as const }, order: ['files' as const, 'old' as never] };
    const layout = normalizeLayout(stored);
    expect(layout.zones.files).toBe('right');
    expect(layout.zones.search).toBe('left');
    expect(layout.order[0]).toBe('files');
    expect([...layout.order].sort()).toEqual([...PANELS].sort());
    expect(normalizeLayout(undefined)).toEqual(DEFAULT_LAYOUT);
  });
});
