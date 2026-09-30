import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { t } from '../i18n';
import {
  applyPreset,
  movePanel,
  PANELS,
  panelsIn,
  PRESETS,
  setLayoutOption,
  shiftPanel,
  type LayoutPreferences,
  type PanelId,
  type PanelWidth,
  type PresetId,
  type Zone,
} from '../layout';
import { panelLabel } from './Panel';
import { usePreferences } from './preferences';
import { Block, Row, Segmented, Toggle } from './settings-parts';

/** The workbench in miniature: bars, side zones with their panels, the sheet. */
export function LayoutDiagram({ layout, compact }: { layout: LayoutPreferences; compact?: boolean }) {
  const zone = (side: 'left' | 'right') => {
    const ids = panelsIn(layout, side);
    if (!ids.length) return null;
    return (
      <span className={`diagram-zone is-${side}`}>
        {!compact &&
          ids.map((id) => (
            <span key={id} className="diagram-panel">
              {panelLabel(id)}
            </span>
          ))}
      </span>
    );
  };
  return (
    <span className={`layout-diagram${compact ? ' is-compact' : ''}`} aria-hidden>
      <span className="diagram-top" />
      <span className="diagram-body">
        {layout.activityBar && <span className="diagram-activity" />}
        {zone('left')}
        <span className="diagram-sheet">
          {layout.tabs && <span className="diagram-tabs" />}
          <span className="diagram-lines">
            <span className="diagram-title" />
            <span className="diagram-line" />
            <span className="diagram-line is-short" />
          </span>
        </span>
        {zone('right')}
      </span>
      {layout.statusBar && <span className="diagram-status" />}
    </span>
  );
}

/** The layout section: ready-made layouts, each panel's place, the bars and the width. */
export function LayoutSettings() {
  const { preferences, update } = usePreferences();
  const layout = preferences.layout;
  const set = (next: LayoutPreferences) => update({ layout: next });
  const presets = Object.keys(PRESETS) as PresetId[];

  return (
    <>
      <Block
        title={t('settings.layout.presets')}
        keywords={[...presets.map((p) => t(`layout.${p}`)), t('layout.custom')].join(' ')}
        actions={
          <button className="button is-ghost" onClick={() => set(applyPreset(layout, 'classic'))}>
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden />
            {t('settings.layout.reset')}
          </button>
        }
      >
        <div className="preset-grid" role="radiogroup" aria-label={t('settings.layout.presets')}>
          {presets.map((preset) => (
            <button
              key={preset}
              role="radio"
              aria-checked={layout.preset === preset}
              className="preset-card"
              onClick={() => set(applyPreset(layout, preset))}
            >
              <LayoutDiagram layout={{ ...layout, ...PRESETS[preset] }} compact />
              <span className="theme-card-name">{t(`layout.${preset}`)}</span>
              <span className="theme-card-note">{t(`layout.${preset}.note`)}</span>
            </button>
          ))}
        </div>
        {layout.preset === 'custom' && (
          <p className="setting-hint">
            <strong>{t('layout.custom')}</strong> · {t('layout.custom.note')}
          </p>
        )}
      </Block>

      <Block title={t('settings.layout.panels')} keywords={PANELS.map(panelLabel).join(' ')}>
        <LayoutDiagram layout={layout} />
        <p className="setting-hint">{t('settings.layout.panelsHint')}</p>
        <ul className="panel-list">
          {PANELS.map((id) => (
            <PanelRow key={id} id={id} layout={layout} onChange={set} />
          ))}
        </ul>
      </Block>

      <Row label={t('settings.layout.tabs')} htmlFor="set-tabs">
        <Toggle id="set-tabs" checked={layout.tabs} onChange={(on) => set(setLayoutOption(layout, 'tabs', on))} />
      </Row>
      <Row label={t('settings.layout.statusBar')} htmlFor="set-status-bar">
        <Toggle id="set-status-bar" checked={layout.statusBar} onChange={(on) => set(setLayoutOption(layout, 'statusBar', on))} />
      </Row>
      <Row label={t('settings.layout.activityBar')} htmlFor="set-activity-bar">
        <Toggle
          id="set-activity-bar"
          checked={layout.activityBar}
          onChange={(on) => set(setLayoutOption(layout, 'activityBar', on))}
        />
      </Row>
      <Row label={t('settings.layout.activityLabels')} htmlFor="set-activity-labels">
        <Toggle
          id="set-activity-labels"
          checked={layout.activityLabels}
          onChange={(on) => set(setLayoutOption(layout, 'activityLabels', on))}
        />
      </Row>
      <Row label={t('settings.layout.width')}>
        <Segmented
          label={t('settings.layout.width')}
          value={layout.width}
          onChange={(width: PanelWidth) => set(setLayoutOption(layout, 'width', width))}
          options={(['narrow', 'normal', 'wide'] as const).map((value) => ({ value, label: t(`panelWidth.${value}`) }))}
        />
      </Row>
    </>
  );
}

/** One panel: its side (left, right, hidden), and its place among its neighbours. */
function PanelRow({
  id,
  layout,
  onChange,
}: {
  id: PanelId;
  layout: LayoutPreferences;
  onChange: (l: LayoutPreferences) => void;
}) {
  const zone = layout.zones[id];
  const siblings = panelsIn(layout, zone);
  const label = panelLabel(id);
  return (
    <li className={`panel-row${zone === 'hidden' ? ' is-hidden' : ''}`}>
      <span className="panel-row-name">{label}</span>
      <Segmented
        label={t('settings.layout.place', { panel: label })}
        value={zone}
        onChange={(next: Zone) => onChange(movePanel(layout, id, next))}
        options={(['left', 'right', 'hidden'] as const).map((value) => ({ value, label: t(`zone.${value}`) }))}
      />
      <button
        className="icon-button"
        disabled={zone === 'hidden' || siblings[0] === id}
        aria-label={t('settings.layout.up', { panel: label })}
        title={t('panel.up')}
        onClick={() => onChange(shiftPanel(layout, id, -1))}
      >
        <ArrowUp size={15} strokeWidth={1.75} />
      </button>
      <button
        className="icon-button"
        disabled={zone === 'hidden' || siblings.at(-1) === id}
        aria-label={t('settings.layout.down', { panel: label })}
        title={t('panel.down')}
        onClick={() => onChange(shiftPanel(layout, id, 1))}
      >
        <ArrowDown size={15} strokeWidth={1.75} />
      </button>
    </li>
  );
}
