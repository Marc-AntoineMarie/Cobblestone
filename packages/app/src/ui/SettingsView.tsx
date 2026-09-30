import { useEffect, useRef, useState } from 'react';
import { CalendarDays, FileText, Info, Languages, LayoutPanelLeft, Link2, Palette, Search, Stamp } from 'lucide-react';
import { LANGUAGES, t } from '../i18n';
import type { VaultSettings } from '../settings';
import type { Theme } from '../themes';
import { AppearancePreview, AppearanceSettings } from './AppearanceSettings';
import { LayoutSettings } from './LayoutSettings';
import { useSession, useStore } from './hooks';
import { usePreferences } from './preferences';
import { Row, SettingsQuery, Toggle } from './settings-parts';

const VERSION = '0.1.0';

const SECTIONS = [
  { id: 'general', icon: Languages, title: () => t('settings.general') },
  { id: 'appearance', icon: Palette, title: () => t('settings.appearance') },
  { id: 'layout', icon: LayoutPanelLeft, title: () => t('settings.layout') },
  { id: 'editor', icon: FileText, title: () => t('settings.editor') },
  { id: 'files', icon: Link2, title: () => t('settings.files') },
  { id: 'daily', icon: CalendarDays, title: () => t('rail.today') },
  { id: 'templates', icon: Stamp, title: () => t('settings.templates') },
  { id: 'about', icon: Info, title: () => t('settings.about') },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

/**
 * Settings open as a tab: they are reference material, not an interruption.
 * One page, every section in order: the list on the left follows the scroll and
 * jumps to a section; the search field keeps only the settings that match.
 */
export function SettingsView() {
  const session = useSession();
  const settings = useStore(session.settings, (s) => s);
  const { preferences, update } = usePreferences();
  const set = (patch: Partial<VaultSettings>) => session.settings.setState(patch);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<SectionId>('general');
  const [preview, setPreview] = useState<Theme | null>(null);
  const [empty, setEmpty] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  /** The section a click jumps to: the scroll that follows does not change the current section. */
  const jumping = useRef<SectionId | null>(null);
  const folders = [
    '',
    ...session.vault
      .getFolders()
      .map((f) => f.path)
      .sort(),
  ];

  // The section at the top of the page is the current one.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const onScroll = () => {
      if (jumping.current) return;
      const top = root.getBoundingClientRect().top + 80;
      let found: SectionId = SECTIONS[0].id;
      for (const section of root.querySelectorAll<HTMLElement>('.settings-section')) {
        if (section.getBoundingClientRect().top <= top) found = section.dataset.section as SectionId;
      }
      setCurrent(found);
    };
    const onScrollEnd = () => (jumping.current = null);
    root.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('scrollend', onScrollEnd);
    return () => {
      root.removeEventListener('scroll', onScroll);
      root.removeEventListener('scrollend', onScrollEnd);
    };
  }, []);

  // Opened at a section (from the status bar's appearance, say).
  const asked = useStore(session.ui, (s) => s.settingsSection);
  useEffect(() => {
    if (!asked) return;
    session.ui.setState({ settingsSection: null });
    if (SECTIONS.some((s) => s.id === asked)) jump(asked as SectionId);
  }, [asked]);

  // Say so when the search leaves nothing.
  useEffect(() => {
    setEmpty(!!query.trim() && !page.current?.querySelector('.setting, .setting-block'));
  }, [query]);

  const jump = (id: SectionId) => {
    setQuery('');
    setCurrent(id);
    jumping.current = id;
    // No scroll to wait for (already there, or reduced motion): release it soon anyway.
    setTimeout(() => jumping.current === id && (jumping.current = null), 1200);
    requestAnimationFrame(() =>
      scroller.current?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
    );
  };

  const section = (id: SectionId, content: React.ReactNode) => {
    const info = SECTIONS.find((s) => s.id === id)!;
    return (
      <section className="settings-section" data-section={id} aria-labelledby={`settings-${id}`}>
        <h2 className="label" id={`settings-${id}`}>
          {info.title()}
        </h2>
        {content}
      </section>
    );
  };

  return (
    <div className="settings-view" ref={scroller}>
      <div className="settings-layout">
        <div className="settings-side">
          <nav className="settings-nav" aria-label={t('settings.sections')}>
            <h1 className="settings-title">{t('settings.title')}</h1>
            <label className="settings-search">
              <Search size={14} strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={query}
                placeholder={t('settings.search')}
                aria-label={t('settings.search')}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {SECTIONS.map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                className="settings-link"
                aria-current={!query.trim() && current === id ? 'true' : undefined}
                onClick={() => jump(id)}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden />
                {title()}
              </button>
            ))}
          </nav>
          <AppearancePreview preview={preview} />
        </div>

        <SettingsQuery.Provider value={query}>
          <div className={`settings-page${query.trim() ? ' is-searching' : ''}`} ref={page}>
            {empty && <p className="settings-empty">{t('settings.noResult', { query: query.trim() })}</p>}

            {section(
              'general',
              <Row label={t('settings.language')} htmlFor="set-language" keywords="language langue">
                <select
                  id="set-language"
                  value={preferences.language}
                  onChange={(e) => update({ language: e.target.value as 'auto' | 'en' | 'fr' })}
                >
                  <option value="auto">Auto</option>
                  {Object.entries(LANGUAGES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </Row>,
            )}

            {section('appearance', <AppearanceSettings onPreview={setPreview} />)}

            {section('layout', <LayoutSettings />)}

            {section(
              'editor',
              <>
                <Row label={t('settings.defaultMode')} htmlFor="set-mode">
                  <select
                    id="set-mode"
                    value={settings.defaultMode}
                    onChange={(e) => set({ defaultMode: e.target.value as VaultSettings['defaultMode'] })}
                  >
                    <option value="live">{t('note.modeEdit')}</option>
                    <option value="read">{t('note.modeRead')}</option>
                    <option value="source">{t('note.modeSource')}</option>
                  </select>
                </Row>
                <Row label={t('settings.lineBreaks')} htmlFor="set-breaks">
                  <Toggle id="set-breaks" checked={settings.lineBreaks} onChange={(lineBreaks) => set({ lineBreaks })} />
                </Row>
                <Row label={t('settings.spellcheck')} htmlFor="set-spell">
                  <Toggle id="set-spell" checked={settings.spellcheck} onChange={(spellcheck) => set({ spellcheck })} />
                </Row>
              </>,
            )}

            {section(
              'files',
              <>
                <Row label={t('settings.newNoteFolder')} htmlFor="set-newfolder">
                  <select
                    id="set-newfolder"
                    value={settings.newNoteLocation === 'folder' ? `folder:${settings.newNoteFolder}` : settings.newNoteLocation}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.startsWith('folder:')) set({ newNoteLocation: 'folder', newNoteFolder: value.slice(7) });
                      else set({ newNoteLocation: value as 'root' | 'current' });
                    }}
                  >
                    <option value="root">{t('settings.vaultRoot')}</option>
                    <option value="current">{t('launcher.kind.folder')} ←</option>
                    {folders.filter(Boolean).map((f) => (
                      <option key={f} value={`folder:${f}`}>
                        {f}
                      </option>
                    ))}
                  </select>
                </Row>
                <Row label={t('settings.attachmentFolder')} htmlFor="set-attach">
                  <select
                    id="set-attach"
                    value={settings.attachmentLocation}
                    onChange={(e) => set({ attachmentLocation: e.target.value })}
                  >
                    <option value="/">{t('settings.vaultRoot')}</option>
                    <option value="./">./</option>
                    {folders.filter(Boolean).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                    {!['/', './', ...folders].includes(settings.attachmentLocation) && (
                      <option value={settings.attachmentLocation}>{settings.attachmentLocation}</option>
                    )}
                  </select>
                </Row>
                <Row label={t('settings.updateLinks')} htmlFor="set-links">
                  <Toggle id="set-links" checked={settings.updateLinks} onChange={(updateLinks) => set({ updateLinks })} />
                </Row>
                <Row label={t('settings.trash')} htmlFor="set-trash">
                  <select
                    id="set-trash"
                    value={settings.trash}
                    onChange={(e) => set({ trash: e.target.value as VaultSettings['trash'] })}
                  >
                    <option value="vault">{t('settings.trash.vault')}</option>
                    <option value="permanent">{t('settings.trash.permanent')}</option>
                  </select>
                </Row>
              </>,
            )}

            {section(
              'daily',
              <>
                <Row label="Format" htmlFor="set-daily-format" hint="YYYY-MM-DD, dddd D MMMM…" keywords={t('rail.today')}>
                  <input
                    id="set-daily-format"
                    value={settings.dailyFormat}
                    onChange={(e) => set({ dailyFormat: e.target.value })}
                  />
                </Row>
                <Row label={t('settings.newNoteFolder')} htmlFor="set-daily-folder" keywords={t('rail.today')}>
                  <select
                    id="set-daily-folder"
                    value={settings.dailyFolder}
                    onChange={(e) => set({ dailyFolder: e.target.value })}
                  >
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        {f || t('settings.vaultRoot')}
                      </option>
                    ))}
                  </select>
                </Row>
              </>,
            )}

            {section(
              'templates',
              <>
                <Row label={t('settings.templatesFolder')} htmlFor="set-templates">
                  <select
                    id="set-templates"
                    value={settings.templatesFolder}
                    onChange={(e) => set({ templatesFolder: e.target.value })}
                  >
                    <option value="">{t('settings.templatesAuto')}</option>
                    {folders.filter(Boolean).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </Row>
                <Row label={t('settings.dateFormat')} htmlFor="set-tpl-date" hint="{{date}}" keywords={t('settings.templates')}>
                  <input
                    id="set-tpl-date"
                    value={settings.templateDateFormat}
                    onChange={(e) => set({ templateDateFormat: e.target.value })}
                  />
                </Row>
                <Row label={t('settings.timeFormat')} htmlFor="set-tpl-time" hint="{{time}}" keywords={t('settings.templates')}>
                  <input
                    id="set-tpl-time"
                    value={settings.templateTimeFormat}
                    onChange={(e) => set({ templateTimeFormat: e.target.value })}
                  />
                </Row>
              </>,
            )}

            {section(
              'about',
              <Row label="Cobblestone" keywords={`${t('settings.about')} AGPL version`}>
                <p className="settings-about">{t('settings.aboutText', { version: VERSION })}</p>
              </Row>,
            )}
          </div>
        </SettingsQuery.Provider>
      </div>
    </div>
  );
}
