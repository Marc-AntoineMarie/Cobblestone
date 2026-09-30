/*
 * Where each panel of the workbench goes. Two side zones hold panels stacked
 * in order; a panel may also be hidden (its commands stay in the palette).
 * Layouts ready to use set every panel at once; changing one panel afterwards
 * makes the layout "custom".
 */

export type PanelId = 'search' | 'bookmarks' | 'files' | 'tags' | 'backlinks' | 'outline' | 'outgoing' | 'properties';

export type Zone = 'left' | 'right' | 'hidden';

export type PresetId = 'classic' | 'focus' | 'researcher' | 'mirror';

export type PanelWidth = 'narrow' | 'normal' | 'wide';

export interface LayoutPreferences {
  /** The layout ready to use it started from, or "custom" once a panel was moved. */
  preset: PresetId | 'custom';
  zones: Record<PanelId, Zone>;
  /** Order of the panels; each zone shows its own in this order. */
  order: PanelId[];
  /** Tabs above the notes. */
  tabs: boolean;
  statusBar: boolean;
  activityBar: boolean;
  /** Names under the activity bar's buttons. */
  activityLabels: boolean;
  width: PanelWidth;
}

/** Every panel, in its default order. */
export const PANELS: PanelId[] = ['search', 'bookmarks', 'files', 'tags', 'backlinks', 'outline', 'outgoing', 'properties'];

/** Panels about the open note: they show when a note is open. */
export const NOTE_PANELS: PanelId[] = ['backlinks', 'outline', 'outgoing', 'properties'];

/** Width of a side zone, in pixels. */
export const PANEL_WIDTHS: Record<PanelWidth, number> = { narrow: 232, normal: 272, wide: 320 };

const zones = (left: PanelId[], right: PanelId[]): Record<PanelId, Zone> =>
  Object.fromEntries(PANELS.map((id) => [id, left.includes(id) ? 'left' : right.includes(id) ? 'right' : 'hidden'])) as Record<
    PanelId,
    Zone
  >;

export const PRESETS: Record<PresetId, Omit<LayoutPreferences, 'preset' | 'width' | 'activityLabels'>> = {
  classic: {
    zones: zones(['search', 'bookmarks', 'files', 'tags'], ['backlinks', 'outline', 'outgoing', 'properties']),
    order: PANELS,
    tabs: true,
    statusBar: true,
    activityBar: true,
  },
  focus: {
    zones: zones([], []),
    order: PANELS,
    tabs: false,
    statusBar: false,
    activityBar: false,
  },
  researcher: {
    zones: zones(['search', 'files', 'bookmarks'], ['backlinks', 'outgoing', 'outline']),
    order: ['search', 'files', 'bookmarks', 'tags', 'backlinks', 'outgoing', 'outline', 'properties'],
    tabs: true,
    statusBar: true,
    activityBar: true,
  },
  mirror: {
    zones: zones(['backlinks', 'outline', 'outgoing', 'properties'], ['search', 'bookmarks', 'files', 'tags']),
    order: PANELS,
    tabs: true,
    statusBar: true,
    activityBar: true,
  },
};

export const DEFAULT_LAYOUT: LayoutPreferences = { preset: 'classic', ...PRESETS.classic, width: 'normal', activityLabels: true };

/** The layout of a preset, keeping the chosen width. */
export function applyPreset(layout: LayoutPreferences, preset: PresetId): LayoutPreferences {
  return { ...layout, preset, ...PRESETS[preset], order: [...PRESETS[preset].order] };
}

/** The panels of a zone, in order. */
export function panelsIn(layout: LayoutPreferences, zone: Zone): PanelId[] {
  return layout.order.filter((id) => layout.zones[id] === zone);
}

/**
 * Puts a panel in a zone, before `before` (another panel of that zone) or at
 * the end. The layout becomes custom.
 */
export function movePanel(layout: LayoutPreferences, id: PanelId, zone: Zone, before?: PanelId): LayoutPreferences {
  const order = layout.order.filter((p) => p !== id);
  const at = before && before !== id ? order.indexOf(before) : -1;
  if (at === -1) {
    // At the end of the zone: after its last panel, or at the very end.
    const last = order.map((p) => layout.zones[p]).lastIndexOf(zone);
    order.splice(last === -1 ? order.length : last + 1, 0, id);
  } else {
    order.splice(at, 0, id);
  }
  return { ...layout, preset: 'custom', zones: { ...layout.zones, [id]: zone }, order };
}

/** Moves a panel one step up or down among the panels of its zone. */
export function shiftPanel(layout: LayoutPreferences, id: PanelId, step: -1 | 1): LayoutPreferences {
  const siblings = panelsIn(layout, layout.zones[id]);
  const index = siblings.indexOf(id);
  const target = siblings[index + step];
  if (!target) return layout;
  const order = [...layout.order];
  const a = order.indexOf(id);
  const b = order.indexOf(target);
  [order[a], order[b]] = [order[b]!, order[a]!];
  return { ...layout, preset: 'custom', order };
}

/** Changes one of the other layout settings; a preset stays a preset only for its own values. */
export function setLayoutOption<K extends 'tabs' | 'statusBar' | 'activityBar' | 'activityLabels' | 'width'>(
  layout: LayoutPreferences,
  key: K,
  value: LayoutPreferences[K],
): LayoutPreferences {
  const next = { ...layout, [key]: value };
  // The width and the names are matters of taste on top of any layout; the rest makes it custom.
  const taste = key === 'width' || key === 'activityLabels';
  if (!taste && layout.preset !== 'custom' && PRESETS[layout.preset][key as 'tabs'] !== value) next.preset = 'custom';
  return next;
}

/** A stored layout, completed: panels added in later versions go where the classic layout puts them. */
export function normalizeLayout(stored: Partial<LayoutPreferences> | undefined): LayoutPreferences {
  const base = { ...DEFAULT_LAYOUT, ...stored };
  const known = (base.order ?? []).filter((id): id is PanelId => PANELS.includes(id as PanelId));
  const order = [...new Set([...known, ...PANELS])];
  const zonesFixed = Object.fromEntries(
    PANELS.map((id) => {
      const zone = base.zones?.[id];
      return [id, zone === 'left' || zone === 'right' || zone === 'hidden' ? zone : PRESETS.classic.zones[id]];
    }),
  ) as Record<PanelId, Zone>;
  return { ...base, order, zones: zonesFixed };
}
