import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronsUpDown,
  Minus,
  Network,
  Palette,
  PanelLeft,
  PanelRight,
  Plus,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { hotkeyLabel, parseHotkey } from '../commands';
import { t } from '../i18n';
import { applyPreset, panelsIn, PRESETS, type PresetId } from '../layout';
import { TEXT_SIZES } from '../settings';
import { BUILT_IN_THEMES, completeColors, type Theme } from '../themes';
import { themeName } from './AppearanceSettings';
import { useNoteRevision, useSession, useStore } from './hooks';
import { Mark } from './Mark';
import { PANEL_INFO, panelLabel } from './Panel';
import { usePreferences } from './preferences';
import { PressStatus } from './PressStatus';
import { Segmented } from './settings-parts';
import { SyncStatus } from './SyncStatus';

/** The shortcut of the finder (see app-commands), shown in the command field. */
const FINDER_KEY = hotkeyLabel(parseHotkey('Mod+K'));

/** The vault, the command field in the middle, and the buttons of the side panels. */
export function TopBar({ onSwitchVault }: { onSwitchVault: () => void }) {
  const session = useSession();
  const leftOpen = useStore(session.ui, (s) => s.leftOpen);
  const rightOpen = useStore(session.ui, (s) => s.rightOpen);
  const { preferences } = usePreferences();
  const layout = preferences.layout;

  const vaultMenu = (event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    session.ui.setState({
      menu: {
        x: rect.left,
        y: rect.bottom + 4,
        items: [
          { label: t('rail.settings'), run: () => session.openView({ type: 'settings' }, 'tab') },
          ...(session.canRevealInSystem ? [{ label: t('rail.openVaultFolder'), run: () => session.revealInSystem('') }] : []),
          { label: t('rail.switchVault'), run: onSwitchVault },
        ],
      },
    });
  };

  return (
    <header className="top-bar">
      <button className="vault-switch" onClick={vaultMenu} aria-haspopup="menu">
        <Mark size={22} />
        <span className="vault-name">{session.vault.name}</span>
        <ChevronsUpDown size={14} strokeWidth={1.75} aria-hidden />
      </button>
      <button className="command-field" onClick={() => session.ui.setState({ finder: { mode: 'notes' } })}>
        <Search size={15} strokeWidth={1.75} aria-hidden />
        <span className="command-field-text">{t('top.command')}</span>
        <kbd>{FINDER_KEY}</kbd>
      </button>
      <div className="top-actions">
        {panelsIn(layout, 'left').length > 0 && (
          <button
            className="icon-button"
            aria-pressed={leftOpen}
            aria-label={t('side.toggleLeft')}
            title={t('side.toggleLeft')}
            onClick={() => session.ui.setState({ leftOpen: !leftOpen })}
          >
            <PanelLeft size={17} strokeWidth={1.75} />
          </button>
        )}
        {panelsIn(layout, 'right').length > 0 && (
          <button
            className="icon-button"
            aria-pressed={rightOpen}
            aria-label={t('side.toggleRight')}
            title={t('side.toggleRight')}
            onClick={() => session.ui.setState({ rightOpen: !rightOpen })}
          >
            <PanelRight size={17} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </header>
  );
}

/** One button of the activity bar: an icon, and its name under it unless the reader hid the names. */
function ActivityButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button className="activity-button" aria-label={label} title={label} onClick={onClick}>
      <Icon size={19} strokeWidth={1.75} aria-hidden />
      <span className="activity-label" aria-hidden>
        {label}
      </span>
    </button>
  );
}

/**
 * Along the left edge: the panels of the left side (a click shows one, its
 * side opened), then today's note and the graph, and the settings at the bottom.
 */
export function ActivityBar() {
  const session = useSession();
  const { preferences } = usePreferences();
  const layout = preferences.layout;
  // A panel with nothing to show (no bookmarks yet) gets no button.
  const hasBookmarks = useStore(session.bookmarks, (b) => b.length > 0);
  const shown = panelsIn(layout, 'left').filter((id) => id !== 'bookmarks' || hasBookmarks);
  return (
    <nav className={`activity-bar${layout.activityLabels ? ' has-labels' : ''}`} aria-label={t('activity.label')}>
      {shown.map((id) => (
        <ActivityButton key={id} icon={PANEL_INFO[id].icon} label={panelLabel(id)} onClick={() => session.revealPanel(id)} />
      ))}
      <span className="activity-rule" aria-hidden />
      <ActivityButton icon={CalendarDays} label={t('rail.today')} onClick={() => void session.openDailyNote()} />
      <ActivityButton icon={Network} label={t('rail.graph')} onClick={() => session.openView({ type: 'graph' }, 'tab')} />
      <span className="activity-space" />
      <ActivityButton icon={Settings} label={t('rail.settings')} onClick={() => session.openView({ type: 'settings' }, 'tab')} />
    </nav>
  );
}

function countWords(text: string): { words: number; chars: number } {
  const body = text.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/%%[\s\S]*?%%/g, '');
  const plain = body.replace(/[#>*_`~=[\]()|!-]/g, ' ');
  const words = plain.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return { words, chars: body.replace(/\s/g, '').length };
}

/** Words, characters and backlinks of the active note. */
function NoteStatus({ path }: { path: string }) {
  const session = useSession();
  const revision = useNoteRevision(path);
  const { preferences } = usePreferences();
  const stats = useMemo(() => {
    void revision;
    const text = session.vault.cachedRead(path) ?? '';
    return { ...countWords(text), backlinks: session.vault.cache.getBacklinks(path).length };
  }, [session, path, revision]);
  const backlinksShown = preferences.layout.zones.backlinks !== 'hidden';
  return (
    <div className="note-status" aria-live="off">
      <span>{t('status.words', { count: stats.words })}</span>
      <span>{t('status.chars', { count: stats.chars })}</span>
      {backlinksShown ? (
        <button className="status-link" onClick={() => session.revealPanel('backlinks')}>
          {t('status.backlinks', { count: stats.backlinks })}
        </button>
      ) : (
        <span>{t('status.backlinks', { count: stats.backlinks })}</span>
      )}
    </div>
  );
}

/** Along the bottom: where the vault stands, the active note's counts, and the appearance. */
export function StatusBar() {
  const session = useSession();
  const notePath = useStore(session.workspace, () => (session.activeView?.type === 'note' ? session.activePath : null));
  const [quick, setQuick] = useState(false);
  return (
    <footer className="status-bar">
      <PressStatus />
      <span className="status-space" />
      {notePath && <NoteStatus path={notePath} />}
      <SyncStatus />
      <div className="status-appearance">
        <button
          className={`status-button${quick ? ' is-on' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={quick}
          onClick={() => setQuick(!quick)}
        >
          <Palette size={13} strokeWidth={2} aria-hidden />
          {t('settings.appearance')}
        </button>
        {quick && <QuickAppearance onClose={() => setQuick(false)} />}
      </div>
    </footer>
  );
}

/** The appearance at hand, from the status bar: themes, paper, text size, line length and layout. */
function QuickAppearance({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const { preferences, update, theme, paper } = usePreferences();
  const settings = useStore(session.settings, (s) => s);
  const box = useRef<HTMLElement>(null);
  const themes = [...BUILT_IN_THEMES, ...preferences.customThemes];

  // Escape or a click elsewhere closes it; the keyboard starts inside.
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('button, select')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!box.current?.contains(target) && !(target as HTMLElement).closest?.('.status-appearance')) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);

  const pick = (picked: Theme) => {
    const night = picked.scheme === 'dark';
    update({
      ...(night ? { nightTheme: picked.id } : { dayTheme: picked.id }),
      ...(preferences.theme !== 'system' ? { theme: night ? 'night' : 'day' } : {}),
    });
  };
  const sizes = [...new Set([...TEXT_SIZES, settings.textSize])].sort((a, b) => a - b);
  const sizeIndex = sizes.indexOf(settings.textSize);

  return (
    <section className="quick-appearance" role="dialog" aria-label={t('settings.appearance')} ref={box}>
      <h2 className="label">{t('settings.appearance')}</h2>
      <div className="quick-themes" role="radiogroup" aria-label={t('settings.appearance.themes')}>
        {themes.map((candidate) => {
          const c = completeColors(candidate);
          const chosen = candidate.id === (candidate.scheme === 'dark' ? preferences.nightTheme : preferences.dayTheme);
          return (
            <button
              key={candidate.id}
              role="radio"
              aria-checked={chosen}
              aria-label={themeName(candidate)}
              title={themeName(candidate)}
              className="quick-theme"
              style={{ background: `linear-gradient(135deg, ${c.paper} 50%, ${c.accent} 50%)` }}
              onClick={() => pick(candidate)}
            />
          );
        })}
      </div>
      <p className="quick-note">
        {themeName(theme)} · {t(paper === 'night' ? 'settings.theme.night' : 'settings.theme.day')}
      </p>
      <div className="quick-row is-stacked">
        <span>{t('settings.theme')}</span>
        <Segmented
          label={t('settings.theme')}
          value={preferences.theme}
          onChange={(value) => update({ theme: value })}
          options={(['system', 'day', 'night'] as const).map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
        />
      </div>
      <div className="quick-row">
        <span>{t('settings.textSize')}</span>
        <div className="stepper" role="group" aria-label={t('settings.textSize')}>
          <button
            aria-label={t('quick.smaller')}
            disabled={sizeIndex <= 0}
            onClick={() => session.settings.setState({ textSize: sizes[sizeIndex - 1]! })}
          >
            <Minus size={14} strokeWidth={2} />
          </button>
          <output>{settings.textSize} px</output>
          <button
            aria-label={t('quick.bigger')}
            disabled={sizeIndex >= sizes.length - 1}
            onClick={() => session.settings.setState({ textSize: sizes[sizeIndex + 1]! })}
          >
            <Plus size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="quick-row is-stacked">
        <span>{t('settings.lineWidth')}</span>
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
      </div>
      <div className="quick-row is-stacked">
        <span>{t('settings.layout')}</span>
        <div className="quick-presets" role="radiogroup" aria-label={t('settings.layout')}>
          {(Object.keys(PRESETS) as PresetId[]).map((preset) => (
            <button
              key={preset}
              role="radio"
              aria-checked={preferences.layout.preset === preset}
              className="chip"
              onClick={() => update({ layout: applyPreset(preferences.layout, preset) })}
            >
              {t(`layout.${preset}`)}
            </button>
          ))}
        </div>
      </div>
      <button
        className="link-button"
        onClick={() => {
          onClose();
          session.openSettings('appearance');
        }}
      >
        {t('quick.all')}
      </button>
    </section>
  );
}
