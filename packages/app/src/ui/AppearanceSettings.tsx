import { useMemo, type CSSProperties } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { appearanceTokens } from '../appearance';
import { getLanguage, t, type MessageKey } from '../i18n';
import { DEFAULT_SETTINGS, TEXT_SIZES, type CodeFont, type Corners, type Density, type UiFont } from '../settings';
import {
  BUILT_IN_THEMES,
  checkContrast,
  COLOR_ROLES,
  completeColors,
  type ColorRole,
  type NoteFont,
  type Theme,
  type ThemeColors,
} from '../themes';
import { useSession, useStore } from './hooks';
import { usePreferences } from './preferences';
import { Block, Row, Segmented } from './settings-parts';

/** A theme's name: its own for a custom theme, the translated one for a built-in theme. */
export function themeName(theme: Theme): string {
  return theme.name ?? t(`theme.${theme.id}` as MessageKey);
}

function themeNote(theme: Theme): string {
  return theme.name ? '' : t(`theme.${theme.id}.note` as MessageKey);
}

/** A theme with the colours changed in the settings. */
function withOverrides(theme: Theme, overrides: Partial<ThemeColors> | undefined): Theme {
  return overrides ? { ...theme, colors: { ...theme.colors, ...overrides } } : theme;
}

/** A card showing a theme in miniature: its sidebar, a title, lines of text, the accent and the highlight. */
function ThemeCard({
  theme,
  checked,
  onPick,
  onPreview,
}: {
  theme: Theme;
  checked: boolean;
  onPick: () => void;
  onPreview: (theme: Theme | null) => void;
}) {
  const c = completeColors(theme);
  const style = {
    '--swatch-paper': c.paper,
    '--swatch-surface': c.paper2,
    '--swatch-ink': c.ink,
    '--swatch-ink-2': c.ink2,
    '--swatch-accent': c.accent,
    '--swatch-mark': c.mark,
  } as CSSProperties;
  return (
    <button
      role="radio"
      aria-checked={checked}
      className="theme-card"
      onClick={onPick}
      onMouseEnter={() => onPreview(theme)}
      onMouseLeave={() => onPreview(null)}
      onFocus={() => onPreview(theme)}
      onBlur={() => onPreview(null)}
    >
      <span className="theme-swatch" style={style} aria-hidden>
        <span className="theme-swatch-side" />
        <span className="theme-swatch-page">
          <span className="theme-swatch-title" />
          <span className="theme-swatch-line" />
          <span className="theme-swatch-line is-short" />
          <span className="theme-swatch-inks">
            <span className="theme-swatch-accent" />
            <span className="theme-swatch-mark" />
          </span>
        </span>
      </span>
      <span className="theme-card-name">
        {themeName(theme)}
        {checked && <Check size={14} strokeWidth={2.5} aria-label={t('settings.chosen')} />}
      </span>
      {themeNote(theme) && <span className="theme-card-note">{themeNote(theme)}</span>}
    </button>
  );
}

/** The appearance section: paper, themes, colours, fonts, sizes and shapes. */
export function AppearanceSettings({ onPreview }: { onPreview: (theme: Theme | null) => void }) {
  const session = useSession();
  const settings = useStore(session.settings, (s) => s);
  const { preferences, update, theme } = usePreferences();
  const themes = [...BUILT_IN_THEMES, ...preferences.customThemes];
  const overrides = preferences.colorOverrides[theme.id];
  const current = withOverrides(theme, overrides);
  const colors = completeColors(current);
  const failing = checkContrast(current).filter((check) => !check.ok);

  const pick = (picked: Theme) => {
    const night = picked.scheme === 'dark';
    update({
      ...(night ? { nightTheme: picked.id } : { dayTheme: picked.id }),
      // A paper chosen by hand switches to the one the theme is printed on, so the choice shows.
      ...(preferences.theme !== 'system' ? { theme: night ? 'night' : 'day' } : {}),
    });
  };

  const setColor = (role: ColorRole, value: string) =>
    update({ colorOverrides: { ...preferences.colorOverrides, [theme.id]: { ...overrides, [role]: value } } });

  const resetColors = () => {
    const { [theme.id]: _removed, ...rest } = preferences.colorOverrides;
    update({ colorOverrides: rest });
  };

  const group = (scheme: Theme['scheme'], label: string, chosen: string) => (
    <div className="theme-group">
      <h4 className="theme-group-label">{label}</h4>
      <div className="theme-grid" role="radiogroup" aria-label={label}>
        {themes
          .filter((candidate) => candidate.scheme === scheme)
          .map((candidate) => (
            <ThemeCard
              key={candidate.id}
              theme={withOverrides(candidate, preferences.colorOverrides[candidate.id])}
              checked={candidate.id === chosen}
              onPick={() => pick(candidate)}
              onPreview={onPreview}
            />
          ))}
      </div>
    </div>
  );

  const noteFonts: NoteFont[] = ['archivo', 'literata', 'atkinson', 'system-sans', 'system-serif'];
  const themeFont = theme.noteFont ? t(`font.${theme.noteFont}`) : t(`font.${preferences.uiFont}` as MessageKey);

  return (
    <>
      <Row label={t('settings.theme')} keywords={`${t('settings.theme.day')} ${t('settings.theme.night')}`}>
        <Segmented
          label={t('settings.theme')}
          value={preferences.theme}
          onChange={(value) => update({ theme: value })}
          options={(['system', 'day', 'night'] as const).map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
        />
      </Row>

      <Block title={t('settings.appearance.themes')} keywords={themes.map(themeName).join(' ')}>
        {group('light', t('settings.dayTheme'), preferences.dayTheme)}
        {group('dark', t('settings.nightTheme'), preferences.nightTheme)}
      </Block>

      <Block
        title={t('settings.colors', { theme: themeName(theme) })}
        keywords={COLOR_ROLES.map((role) => t(`color.${role}`)).join(' ')}
        actions={
          overrides && (
            <button className="button is-ghost" onClick={resetColors}>
              <RotateCcw size={14} strokeWidth={1.75} aria-hidden />
              {t('settings.colors.reset')}
            </button>
          )
        }
      >
        <div className="color-roles">
          {COLOR_ROLES.map((role) => (
            <label key={role} className="color-role">
              <input type="color" value={colors[role]} onChange={(e) => setColor(role, e.target.value)} />
              <span className="color-role-name">{t(`color.${role}`)}</span>
              <code>{colors[role]}</code>
            </label>
          ))}
        </div>
        {failing.length === 0 ? (
          <p className="contrast-note is-ok">
            <Check size={14} strokeWidth={2.5} aria-hidden />
            {t('settings.contrast.ok')}
          </p>
        ) : (
          <p className="contrast-note is-low" role="status">
            {t('settings.contrast.low', {
              pairs: failing.map((check) => t(`contrast.${check.pair}`)).join(', '),
            })}
          </p>
        )}
      </Block>

      <Row label={t('settings.uiFont')} htmlFor="set-ui-font">
        <select id="set-ui-font" value={preferences.uiFont} onChange={(e) => update({ uiFont: e.target.value as UiFont })}>
          {(['archivo', 'atkinson', 'system'] as const).map((font) => (
            <option key={font} value={font}>
              {t(`font.${font}`)}
            </option>
          ))}
        </select>
      </Row>
      <Row label={t('settings.noteFont')} htmlFor="set-note-font">
        <select
          id="set-note-font"
          value={preferences.noteFont}
          onChange={(e) => update({ noteFont: e.target.value as NoteFont | 'theme' })}
        >
          <option value="theme">{t('settings.noteFont.theme', { font: themeFont })}</option>
          {noteFonts.map((font) => (
            <option key={font} value={font}>
              {t(`font.${font}`)}
            </option>
          ))}
        </select>
      </Row>
      <Row label={t('settings.codeFont')} htmlFor="set-code-font">
        <select
          id="set-code-font"
          value={preferences.codeFont}
          onChange={(e) => update({ codeFont: e.target.value as CodeFont })}
        >
          <option value="commit-mono">{t('font.commit-mono')}</option>
          <option value="system">{t('font.system-mono')}</option>
        </select>
      </Row>
      <Row label={t('settings.textSize')} htmlFor="set-text-size">
        <select
          id="set-text-size"
          value={settings.textSize}
          onChange={(e) => session.settings.setState({ textSize: Number(e.target.value) })}
        >
          {[...new Set([...TEXT_SIZES, settings.textSize])]
            .sort((a, b) => a - b)
            .map((size) => (
              <option key={size} value={size}>
                {size.toLocaleString(getLanguage())} px
                {size === DEFAULT_SETTINGS.textSize ? ` (${t('settings.default')})` : ''}
              </option>
            ))}
        </select>
      </Row>
      <Row label={t('settings.lineWidth')}>
        <Segmented
          label={t('settings.lineWidth')}
          value={settings.readableLength ? settings.lineWidth : 'full'}
          onChange={(width) =>
            session.settings.setState(width === 'full' ? { readableLength: false } : { readableLength: true, lineWidth: width })
          }
          options={(['narrow', 'normal', 'wide', 'full'] as const).map((value) => ({
            value,
            label: t(`settings.lineWidth.${value}`),
          }))}
        />
      </Row>
      <Row label={t('settings.density')}>
        <Segmented
          label={t('settings.density')}
          value={preferences.density}
          onChange={(density: Density) => update({ density })}
          options={(['compact', 'normal', 'airy'] as const).map((value) => ({ value, label: t(`density.${value}`) }))}
        />
      </Row>
      <Row label={t('settings.corners')}>
        <Segmented
          label={t('settings.corners')}
          value={preferences.corners}
          onChange={(corners: Corners) => update({ corners })}
          options={(['square', 'soft', 'round'] as const).map((value) => ({ value, label: t(`corners.${value}`) }))}
        />
      </Row>
    </>
  );
}

/**
 * The app in miniature, painted with a theme and the appearance preferences:
 * the theme pointed at in the settings, else the one in use.
 */
export function AppearancePreview({ preview }: { preview: Theme | null }) {
  const { preferences, theme } = usePreferences();
  const shown = preview ?? theme;
  const tokens = useMemo(() => appearanceTokens(preferences, shown, true), [preferences, shown]);
  const size = useStore(useSession().settings, (s) => s.textSize);
  return (
    <aside className="settings-preview" aria-label={t('settings.preview')}>
      <h2 className="label">{t('settings.preview')}</h2>
      <p className="settings-preview-hint">{t('settings.preview.hint')}</p>
      <div className="preview-app" style={tokens as CSSProperties}>
        <div className="preview-bar">
          <strong>{themeName(shown)}</strong>
          <span className="preview-field" />
        </div>
        <div className="preview-body">
          <div className="preview-side">
            <span className="preview-row is-folder">Projets</span>
            <span className="preview-row is-selected">{t('settings.preview.title')}</span>
            <span className="preview-row">{t('settings.preview.link')}</span>
            <span className="preview-row">Journal</span>
          </div>
          <div className="preview-sheet">
            <div className="preview-head">
              <strong className="preview-title">{t('settings.preview.title')}</strong>
              <span className="preview-stamp">{t('note.share')}</span>
            </div>
            <p>
              <span className="preview-link">{t('settings.preview.link')}</span> ·{' '}
              <span className="preview-mark">{t('settings.preview.mark')}</span>
            </p>
            <p className="preview-task">
              <span className="preview-box" aria-hidden />
              {t('settings.preview.task')}
            </p>
            <code className="preview-code">`code`</code>
          </div>
        </div>
      </div>
      <div className="preview-note" style={tokens as CSSProperties}>
        <span className="label">{t('settings.preview.note')}</span>
        <p>
          {t('settings.preview.text', { size: `${size.toLocaleString(getLanguage())} px`, link: '¶', mark: '¤' })
            .split(/([¶¤])/)
            .map((part, i) =>
              part === '¶' ? (
                <span key={i} className="preview-link">
                  {t('settings.preview.link')}
                </span>
              ) : part === '¤' ? (
                <span key={i} className="preview-mark">
                  {t('settings.preview.mark')}
                </span>
              ) : (
                part
              ),
            )}
        </p>
      </div>
    </aside>
  );
}
