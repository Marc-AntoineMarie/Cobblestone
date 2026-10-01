import { useEffect, useState, type FormEvent } from 'react';
import { FolderOpen, Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import { describeError } from '../errors';
import { t } from '../i18n';
import type { Platform, VaultEntry } from '../platform';
import { LostVault } from './LostVault';
import { Mark } from './Mark';
import { ReceiveVault } from './ReceiveVault';

interface Props {
  platform: Platform;
  opening: VaultEntry | null;
  /** Notes read so far while `opening` loads. */
  progress: { done: number; total: number } | null;
  onCancelOpening: () => void;
  error: string | null;
  /** A vault whose folder could not be found when opening it. */
  lost: VaultEntry | null;
  onOpen: (entry: VaultEntry) => void;
  onLostClose: () => void;
}

const DEMO: VaultEntry = { id: 'demo', name: 'Demo', kind: 'demo', lastOpened: 0 };

/** First screen: open a folder, create a vault, or try the demo. */
export function Launcher({ platform, opening, progress, onCancelOpening, error, lost, onOpen, onLostClose }: Props) {
  const [recent, setRecent] = useState<VaultEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  /** Browser vaults exist only here: removing one asks first. */
  const [confirming, setConfirming] = useState<string | null>(null);
  /** Errors from picking or creating a folder; opening errors come from the app. */
  const [failure, setFailure] = useState<string | null>(null);
  /** Receiving a vault from another device, with a code. */
  const [receiving, setReceiving] = useState(false);

  const refresh = () =>
    void platform.recentVaults().then((list) => setRecent([...list].sort((a, b) => b.lastOpened - a.lastOpened)));
  useEffect(refresh, [platform]);

  const open = (entry: VaultEntry) => {
    setFailure(null);
    onOpen(entry);
  };

  const pick = async () => {
    setFailure(null);
    try {
      const entry = await platform.pickFolder();
      if (entry) onOpen(entry);
    } catch (e) {
      setFailure(t('launcher.error', { error: describeError(e) }));
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    try {
      const entry = await platform.createVault(name.trim() || t('launcher.namePlaceholder'));
      if (entry) onOpen(entry);
    } catch (e) {
      setFailure(t('launcher.createError', { error: describeError(e) }));
    }
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

        {receiving ? (
          <ReceiveVault platform={platform} onOpen={open} onClose={() => setReceiving(false)} />
        ) : (
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

            <button className="launch-action" onClick={() => setReceiving(true)} disabled={busy}>
              <RefreshCw size={20} strokeWidth={1.75} aria-hidden />
              <span className="launch-action-text">
                <strong>{t('launcher.receive')}</strong>
                <span>{t('launcher.receive.hint')}</span>
              </span>
            </button>

            <button className="launch-action" onClick={() => open(DEMO)} disabled={busy}>
              <Sparkles size={20} strokeWidth={1.75} aria-hidden />
              <span className="launch-action-text">
                <strong>{t('launcher.demo')}</strong>
                <span>{t('launcher.demo.hint')}</span>
              </span>
            </button>
          </div>
        )}

        {lost && !opening && (
          <LostVault
            key={lost.id}
            platform={platform}
            entry={lost}
            onFollow={open}
            onForget={() => {
              onLostClose();
              void platform.forgetVault(lost.id).then(refresh);
            }}
            onClose={onLostClose}
          />
        )}

        {opening ? (
          <div className="launcher-status launcher-opening" role="status">
            <span>
              {progress && progress.total > 0
                ? t('launcher.openingProgress', {
                    name: opening.name,
                    done: progress.done.toLocaleString(),
                    total: progress.total.toLocaleString(),
                  })
                : t('launcher.opening', { name: opening.name })}
            </span>
            <button className="button is-ghost" onClick={onCancelOpening}>
              {t('launcher.cancel')}
            </button>
          </div>
        ) : (
          (error || failure) && (
            <p className="launcher-status is-error" role="alert">
              {failure ?? t('launcher.error', { error: error! })}
            </p>
          )
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
                  <button className="recent-open" onClick={() => open(entry)} disabled={busy}>
                    <span className="recent-name">{entry.name}</span>
                    <span className="recent-where">
                      {/* Cut from the left, so the end of the path stays visible; the marks keep slashes in place. */}
                      {entry.location ? `\u200e${entry.location}\u200e` : t(`launcher.kind.${entry.kind}`)}
                    </span>
                    {entry.missing ? (
                      <span className="recent-state">
                        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                          <circle cx="6" cy="6" r="4" className="shape-ring" />
                        </svg>
                        {t('launcher.missing')}
                      </span>
                    ) : (
                      <time className="recent-date" dateTime={new Date(entry.lastOpened).toISOString()}>
                        {new Date(entry.lastOpened).toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </time>
                    )}
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
