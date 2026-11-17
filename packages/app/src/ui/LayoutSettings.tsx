import { ChevronDown, ChevronUp } from 'lucide-react';
import { t } from '../i18n';
import {
  applyPreset,
  DEFAULT_LAYOUT,
  MARGIN_TABS,
  PRESETS,
  setLayoutOption,
  shiftRailTab,
  toggleRailTab,
  type MarginTab,
  type PanelWidth,
  type PresetId,
  type TabsWhen,
} from '../layout';
import { MARGIN_INFO, marginLabel } from './Panel';
import { usePreferences } from './preferences';
import { Row, Segmented, Toggle } from './settings-parts';

const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

/** Settings › Layout: what the workbench shows around a note, and how wide. */
export function LayoutSettings() {
  const { preferences, update } = usePreferences();
  const layout = preferences.layout;
  const set = (next: typeof layout) => update({ layout: next });

  return (
    <>
      <h3 className="label">{t('settings.layout.presets')}</h3>
      <div className="layout-presets" role="radiogroup" aria-label={t('settings.layout.presets')}>
        {PRESET_IDS.map((preset) => (
          <button
            key={preset}
            role="radio"
            aria-checked={layout.preset === preset}
            className={`layout-preset${layout.preset === preset ? ' is-on' : ''}`}
            onClick={() => set(applyPreset(layout, preset))}
          >
            <span className="layout-preset-shape" aria-hidden>
              {PRESETS[preset].list && <span className="layout-preset-list" />}
              <span className="layout-preset-sheet" />
              {PRESETS[preset].margin && <span className="layout-preset-margin" />}
            </span>
            <strong>{t(`layout.${preset}`)}</strong>
            <span>{t(`layout.${preset}.note`)}</span>
          </button>
        ))}
        {layout.preset === 'custom' && (
          <p className="layout-custom">
            <strong>{t('layout.custom')}</strong> {t('layout.custom.note')}
          </p>
        )}
      </div>

      <Row label={t('settings.layout.list')} htmlFor="layout-list">
        <Toggle
          id="layout-list"
          label={t('settings.layout.list')}
          checked={layout.list}
          onChange={(value: boolean) => set(setLayoutOption(layout, 'list', value))}
        />
      </Row>
      <Row label={t('settings.layout.margin')} htmlFor="layout-margin">
        <Toggle
          id="layout-margin"
          label={t('settings.layout.margin')}
          checked={layout.margin}
          onChange={(value: boolean) => set(setLayoutOption(layout, 'margin', value))}
        />
      </Row>

      <h3 className="label">{t('settings.layout.rail')}</h3>
      <p className="setting-hint">{t('settings.layout.railHint')}</p>
      <ul className="rail-settings">
        {[...layout.rail, ...MARGIN_TABS.filter((id) => !layout.rail.includes(id))].map((id: MarginTab, index) => {
          const Icon = MARGIN_INFO[id].icon;
          const shown = layout.rail.includes(id);
          return (
            <li key={id} className={`rail-setting${shown ? '' : ' is-off'}`}>
              <Icon size={16} strokeWidth={1.75} aria-hidden />
              <span className="rail-setting-name">{marginLabel(id)}</span>
              <button
                className="icon-button"
                aria-label={t('settings.layout.railUp', { panel: marginLabel(id) })}
                disabled={!shown || index === 0}
                onClick={() => set(shiftRailTab(layout, id, -1))}
              >
                <ChevronUp size={15} strokeWidth={1.9} />
              </button>
              <button
                className="icon-button"
                aria-label={t('settings.layout.railDown', { panel: marginLabel(id) })}
                disabled={!shown || index >= layout.rail.length - 1}
                onClick={() => set(shiftRailTab(layout, id, 1))}
              >
                <ChevronDown size={15} strokeWidth={1.9} />
              </button>
              <Toggle id={`rail-${id}`} label={marginLabel(id)} checked={shown} onChange={() => set(toggleRailTab(layout, id))} />
            </li>
          );
        })}
      </ul>

      <Row label={t('settings.layout.tabsWhen')}>
        <Segmented
          label={t('settings.layout.tabsWhen')}
          value={layout.tabs}
          onChange={(value: TabsWhen) => set(setLayoutOption(layout, 'tabs', value))}
          options={(['always', 'several', 'never'] as const).map((value) => ({
            value,
            label: t(`settings.layout.tabs.${value}`),
          }))}
        />
      </Row>
      <Row label={t('settings.layout.statusBar')} htmlFor="layout-status">
        <Toggle
          id="layout-status"
          label={t('settings.layout.statusBar')}
          checked={layout.statusBar}
          onChange={(value: boolean) => set(setLayoutOption(layout, 'statusBar', value))}
        />
      </Row>
      <Row label={t('settings.layout.width')}>
        <Segmented
          label={t('settings.layout.width')}
          value={layout.width}
          onChange={(value: PanelWidth) => set(setLayoutOption(layout, 'width', value))}
          options={(['narrow', 'normal', 'wide'] as const).map((value) => ({
            value,
            label: t(`panelWidth.${value}`),
          }))}
        />
      </Row>
      <button className="button" onClick={() => set({ ...DEFAULT_LAYOUT, width: layout.width })}>
        {t('settings.layout.reset')}
      </button>
    </>
  );
}
