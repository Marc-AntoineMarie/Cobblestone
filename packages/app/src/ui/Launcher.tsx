import { useEffect, useState, type FormEvent } from 'react';
import { FolderOpen, Plus, Sparkles, X } from 'lucide-react';
import { t } from '../i18n';
import type { Platform, VaultEntry } from '../platform';
import { Mark } from './Mark';

interface Props {
  platform: Platform;
  opening: VaultEntry | null;
  error: string | null;
  onOpen: (entry: VaultEntry) => void;
}

const DEMO: VaultEntry = { id: 'demo', name: 'Demo', kind: 'demo', lastOpened: 0 };

/** First screen: open a folder, create a vault, or try the demo. */
export function Launcher({ platform, opening, error, onOpen }: Props) {
  const [recent, setRecent] = useState<VaultEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  /** Browser vaults exist only here: removing one asks first. */
  const [confirming, setConfirming] = useState<string | null>(null);

  const refresh = () => void platform.recentVaults().then((list) => setRecent([...list].sort((a, b) => b.lastOpened - a.lastOpened)));
  useEffect(refresh, [platform]);

  const pick = async () => {
    const entry = await platform.pickFolder();
    if (entry) onOpen(entry);
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const entry = await platform.createVault(name.trim() || t('launcher.namePlaceholder'));
    if (entry) onOpen(entry);
  };

  const forget = async (entry: VaultEntry) => {
    if (entry.kind === 'browser' && confirming !== entry.id) {
      setConfirming(entry.id);
      return;
    }
    setConfirming(null);
    await platform.forgetVault(entry.id);
    refresh();
  };

  const canCreate = platform.kind === 'desktop' || platform.capabilities.browserStorage;
  const busy = opening !== null;

  return (
    <main className="launcher">
      <section className="launcher-sheet" aria-labelledby="launcher-title">
        <header className="launcher-head">
          <Mark size={56} />
          <h1 id="launcher-title" className="launcher-title">
            <span className="launcher-title-ink">Cobblestone</span>
            <span className="launcher-title-pink" aria-hidden="true">
              Cobblestone
            </span>
          </h1>
          <p className="launcher-tagline">{t('launcher.tagline')}</p>
        </header>

        <div className="launcher-actions">
          {platform.capabilities.openFolder ? (
            <button className="launch-action is-primary" onClick={pick} disabled={busy}>
              <FolderOpen size={20} strokeWidth={1.75} aria-hidden />
              <span className="launch-action-text">
                <strong>{t('launcher.openFolder')}</strong>
                <span>{t('launcher.openFolder.hint')}</span>
              </span>
            </button>
          ) : (
            <p className="launcher-note">{t('launcher.unsupported')}</p>
          )}

          {canCreate &&
            (creating ? (
              <form className="launch-create" onSubmit={create}>
                <label htmlFor="vault-name">{t('launcher.nameLabel')}</label>
                <div className="launch-create-row">
                  <input
                    id="vault-name"
                    autoFocus
                    value={name}
                    placeholder={t('launcher.namePlaceholder')}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
                  />
                  <button type="submit" className="button is-primary" disabled={busy}>
                    {t('launcher.createAction')}
                  </button>
                  <button type="button" className="button is-ghost" onClick={() => setCreating(false)}>
                    {t('launcher.cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <button className="launch-action" onClick={() => setCreating(true)} disabled={busy}>
                <Plus size={20} strokeWidth={1.75} aria-hidden />
                <span className="launch-action-text">
                  <strong>{t('launcher.create')}</strong>
                  <span>{platform.kind === 'desktop' ? t('launcher.create.hintDesktop') : t('launcher.create.hintWeb')}</span>
                </span>
              </button>
            ))}

          <button className="launch-action" onClick={() => onOpen(DEMO)} disabled={busy}>
            <Sparkles size={20} strokeWidth={1.75} aria-hidden />
            <span className="launch-action-text">
              <strong>{t('launcher.demo')}</strong>
              <span>{t('launcher.demo.hint')}</span>
            </span>
          </button>
        </div>

        {(opening || error) && (
          <p className={`launcher-status${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>
            {error ? t('launcher.error', { error }) : t('launcher.opening', { name: opening!.name })}
          </p>
        )}

        <section className="launcher-recent" aria-labelledby="recent-title">
          <h2 id="recent-title" className="label">
            {t('launcher.recent')}
          </h2>
          {recent.length === 0 ? (
            <p className="launcher-empty">{t('launcher.recent.empty')}</p>
          ) : (
            <ul>
              {recent.map((entry) => (
                <li key={entry.id} className="recent-row">
                  <button className="recent-open" onClick={() => onOpen(entry)} disabled={busy}>
                    <span className="recent-name">{entry.name}</span>
                    <span className="recent-where">{entry.location ?? t(`launcher.kind.${entry.kind}`)}</span>
                    <time className="recent-date" dateTime={new Date(entry.lastOpened).toISOString()}>
                      {new Date(entry.lastOpened).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </time>
                  </button>
                  {confirming === entry.id ? (
                    <span className="recent-confirm" role="group" aria-label={t('launcher.forgetBrowser')}>
                      <button className="button is-danger" onClick={() => void forget(entry)} autoFocus>
                        {t('launcher.forgetBrowser')}
                      </button>
                      <button className="button is-ghost" onClick={() => setConfirming(null)}>
                        {t('launcher.cancel')}
                      </button>
                    </span>
                  ) : (
                    <button
                      className="icon-button"
                      title={entry.kind === 'browser' ? t('launcher.forgetBrowser') : t('launcher.forget')}
                      aria-label={entry.kind === 'browser' ? t('launcher.forgetBrowser') : t('launcher.forget')}
                      onClick={() => void forget(entry)}
                    >
                      <X size={16} strokeWidth={1.75} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
