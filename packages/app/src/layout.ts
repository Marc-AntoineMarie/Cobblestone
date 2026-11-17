/*
 * The shape of the workbench on a computer: the list of notes on the left, the
 * note in the middle, and the margin on the right — a rail of buttons, each
 * opening one panel about the note. Layouts ready to use set it all at once;
 * changing one thing afterwards makes the layout "custom".
 */

/** A panel of the margin, reached by its button in the rail. */
export type MarginTab = 'links' | 'outline' | 'properties' | 'graph';

/** What the list shows. */
export type ListTab = 'recent' | 'folders' | 'tags';

export type PresetId = 'complet' | 'lecture' | 'concentre';

export type PanelWidth = 'narrow' | 'normal' | 'wide';

/** Tabs above the notes: always, only once several are open, or never. */
export type TabsWhen = 'always' | 'several' | 'never';

export interface LayoutPreferences {
  /** The layout ready to use it started from, or "custom" once something moved. */
  preset: PresetId | 'custom';
  /** The list of notes, on the left. */
  list: boolean;
  /** The margin, on the right: its rail and the panel a button opens. */
  margin: boolean;
  /** Buttons of the rail, in order; the ones left out are hidden. */
  rail: MarginTab[];
  tabs: TabsWhen;
  statusBar: boolean;
  width: PanelWidth;
}

/** Every panel of the margin, in its default order. */
export const MARGIN_TABS: MarginTab[] = ['links', 'outline', 'properties', 'graph'];

/** Width of the list and of the margin's panel, in pixels. */
export const PANEL_WIDTHS: Record<PanelWidth, number> = { narrow: 252, normal: 292, wide: 340 };

export const PRESETS: Record<PresetId, Omit<LayoutPreferences, 'preset' | 'width'>> = {
  complet: { list: true, margin: true, rail: MARGIN_TABS, tabs: 'several', statusBar: true },
  lecture: { list: true, margin: false, rail: MARGIN_TABS, tabs: 'never', statusBar: false },
  concentre: { list: false, margin: false, rail: MARGIN_TABS, tabs: 'never', statusBar: false },
};

export const DEFAULT_LAYOUT: LayoutPreferences = { preset: 'complet', ...PRESETS.complet, width: 'normal' };

/** The layout of a preset, keeping the chosen width. */
export function applyPreset(layout: LayoutPreferences, preset: PresetId): LayoutPreferences {
  return { ...layout, preset, ...PRESETS[preset], rail: [...PRESETS[preset].rail] };
}

/** Changes one setting of the layout; it stays a preset only while it matches one. */
export function setLayoutOption<K extends 'list' | 'margin' | 'tabs' | 'statusBar' | 'width'>(
  layout: LayoutPreferences,
  key: K,
  value: LayoutPreferences[K],
): LayoutPreferences {
  const next = { ...layout, [key]: value };
  // The width is a matter of taste on top of any layout; the rest makes it custom.
  if (key !== 'width') next.preset = presetOf(next);
  return next;
}

/** Shows or hides a button of the rail, keeping the order of the others. */
export function toggleRailTab(layout: LayoutPreferences, tab: MarginTab): LayoutPreferences {
  const rail = layout.rail.includes(tab)
    ? layout.rail.filter((id) => id !== tab)
    : MARGIN_TABS.filter((id) => id === tab || layout.rail.includes(id));
  return { ...layout, rail, preset: presetOf({ ...layout, rail }) };
}

/** Moves a button of the rail one step up or down. */
export function shiftRailTab(layout: LayoutPreferences, tab: MarginTab, step: -1 | 1): LayoutPreferences {
  const rail = [...layout.rail];
  const at = rail.indexOf(tab);
  if (at === -1 || !rail[at + step]) return layout;
  [rail[at], rail[at + step]] = [rail[at + step]!, rail[at]!];
  return { ...layout, rail, preset: presetOf({ ...layout, rail }) };
}

/** The preset this layout is exactly, else "custom". */
function presetOf(layout: LayoutPreferences): PresetId | 'custom' {
  const same = (a: MarginTab[], b: MarginTab[]) => a.length === b.length && a.every((id, i) => id === b[i]);
  for (const [id, preset] of Object.entries(PRESETS) as [PresetId, (typeof PRESETS)[PresetId]][]) {
    if (
      preset.list === layout.list &&
      preset.margin === layout.margin &&
      preset.tabs === layout.tabs &&
      preset.statusBar === layout.statusBar &&
      same(preset.rail, layout.rail)
    )
      return id;
  }
  return 'custom';
}

/**
 * A stored layout, completed. A layout from before the workbench was reshaped
 * (panels in two zones) keeps what it can: its width, its tabs and its status
 * bar; its panels come back as the rail's buttons.
 */
export function normalizeLayout(stored: Partial<LayoutPreferences> | undefined): LayoutPreferences {
  const old = stored as { zones?: Record<string, string>; tabs?: unknown } | undefined;
  const fromZones = old?.zones
    ? {
        list: ['search', 'files', 'bookmarks', 'tags'].some((id) => old.zones![id] && old.zones![id] !== 'hidden'),
        margin: ['backlinks', 'outline', 'outgoing', 'properties'].some((id) => old.zones![id] && old.zones![id] !== 'hidden'),
      }
    : {};
  const base = { ...DEFAULT_LAYOUT, ...stored, ...fromZones };
  const width = (['narrow', 'normal', 'wide'] as PanelWidth[]).includes(base.width) ? base.width : 'normal';
  const tabs: TabsWhen =
    base.tabs === 'always' || base.tabs === 'several' || base.tabs === 'never'
      ? base.tabs
      : base.tabs === false
        ? 'never'
        : 'several';
  const known = (Array.isArray(base.rail) ? base.rail : []).filter((id): id is MarginTab => MARGIN_TABS.includes(id));
  const rail = known.length ? known : MARGIN_TABS;
  const layout = { ...base, list: !!base.list, margin: !!base.margin, statusBar: !!base.statusBar, rail, tabs, width };
  return { ...layout, preset: presetOf(layout) };
}
