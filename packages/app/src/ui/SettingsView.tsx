import type { ReactNode } from 'react';
import { LANGUAGES, t } from '../i18n';
import type { VaultSettings } from '../settings';
import { useSession, useStore } from './hooks';
import { usePreferences } from './preferences';

const VERSION = '0.1.0';

function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="setting">
      <div className="setting-text">
        <label htmlFor={htmlFor}>{label}</label>
        {hint && <p>{hint}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function Toggle({ id, checked, onChange }: { id: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button id={id} role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch-knob" />
    </button>
  );
}

/** Settings open as a tab: they are reference material, not an interruption. */
export function SettingsView() {
  const session = useSession();
  const settings = useStore(session.settings, (s) => s);
  const { preferences, update } = usePreferences();
  const set = (patch: Partial<VaultSettings>) => session.settings.setState(patch);
  const folders = [
    '',
    ...session.vault
      .getFolders()
      .map((f) => f.path)
      .sort(),
  ];

  return (
    <div className="settings-view">
      <div className="settings-page">
        <h1 className="settings-title">{t('settings.title')}</h1>

        <section>
          <h2 className="label">{t('settings.appearance')}</h2>
          <Row label={t('settings.theme')}>
            <div className="segmented" role="radiogroup" aria-label={t('settings.theme')}>
              {(['system', 'day', 'night'] as const).map((theme) => (
                <button
                  key={theme}
                  role="radio"
                  aria-checked={preferences.theme === theme}
                  aria-pressed={preferences.theme === theme}
                  onClick={() => update({ theme })}
                >
                  {t(`settings.theme.${theme}`)}
                </button>
              ))}
            </div>
          </Row>
          <Row label={t('settings.language')} htmlFor="set-language">
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
          </Row>
        </section>

        <section>
          <h2 className="label">{t('settings.editor')}</h2>
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
          <Row label={t('settings.readableLength')} htmlFor="set-readable">
            <Toggle id="set-readable" checked={settings.readableLength} onChange={(readableLength) => set({ readableLength })} />
          </Row>
          <Row label={t('settings.lineBreaks')} htmlFor="set-breaks">
            <Toggle id="set-breaks" checked={settings.lineBreaks} onChange={(lineBreaks) => set({ lineBreaks })} />
          </Row>
          <Row label={t('settings.spellcheck')} htmlFor="set-spell">
            <Toggle id="set-spell" checked={settings.spellcheck} onChange={(spellcheck) => set({ spellcheck })} />
          </Row>
        </section>

        <section>
          <h2 className="label">{t('settings.files')}</h2>
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
        </section>

        <section>
          <h2 className="label">{t('rail.today')}</h2>
          <Row label="Format" htmlFor="set-daily-format" hint="YYYY-MM-DD, dddd D MMMM…">
            <input id="set-daily-format" value={settings.dailyFormat} onChange={(e) => set({ dailyFormat: e.target.value })} />
          </Row>
          <Row label={t('settings.newNoteFolder')} htmlFor="set-daily-folder">
            <select id="set-daily-folder" value={settings.dailyFolder} onChange={(e) => set({ dailyFolder: e.target.value })}>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f || t('settings.vaultRoot')}
                </option>
              ))}
            </select>
          </Row>
        </section>

        <section>
          <h2 className="label">{t('settings.templates')}</h2>
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
          <Row label={t('settings.dateFormat')} htmlFor="set-tpl-date" hint="{{date}}">
            <input
              id="set-tpl-date"
              value={settings.templateDateFormat}
              onChange={(e) => set({ templateDateFormat: e.target.value })}
            />
          </Row>
          <Row label={t('settings.timeFormat')} htmlFor="set-tpl-time" hint="{{time}}">
            <input
              id="set-tpl-time"
              value={settings.templateTimeFormat}
              onChange={(e) => set({ templateTimeFormat: e.target.value })}
            />
          </Row>
        </section>

        <section>
          <h2 className="label">{t('settings.about')}</h2>
          <p className="settings-about">{t('settings.aboutText', { version: VERSION })}</p>
        </section>
      </div>
    </div>
  );
}
