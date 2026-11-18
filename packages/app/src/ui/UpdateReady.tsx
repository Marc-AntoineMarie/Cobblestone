import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { t } from '../i18n';
import type { Platform } from '../platform';
import { VERSION } from './SettingsView';
import { PENDING_UPDATE_KEY, UpdateInstalling } from './UpdateInstalling';

const APPLIED_NOTICE_DELAY = 8000;

/** A newer version was downloaded: restart into it now, or later (it installs on quit). */
export function UpdateReady({ platform }: { platform: Platform }) {
  const [version, setVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  useEffect(() => {
    if (!platform.updates) return;
    void platform.updates.status().then((s) => s.kind === 'ready' && setVersion(s.version));
    return platform.updates.onStatus((s) => setVersion(s.kind === 'ready' ? s.version : null));
  }, [platform]);

  useEffect(() => {
    if (!platform.updates) return;
    void platform.storage.get<string>(PENDING_UPDATE_KEY).then((pending) => {
      if (!pending) return;
      void platform.storage.set(PENDING_UPDATE_KEY, null);
      if (pending === VERSION) setApplied(pending);
    });
  }, [platform]);

  useEffect(() => {
    if (!applied) return;
    const id = setTimeout(() => setApplied(null), APPLIED_NOTICE_DELAY);
    return () => clearTimeout(id);
  }, [applied]);

  if (installing) return <UpdateInstalling version={installing} platform={platform} />;

  if (applied) {
    return (
      <aside className="update-ready" role="status">
        <RefreshCw size={15} strokeWidth={2} aria-hidden />
        <span>{t('update.applied', { version: applied })}</span>
      </aside>
    );
  }

  if (!version || dismissed || !platform.updates) return null;
  return (
    <aside className="update-ready" role="status">
      <RefreshCw size={15} strokeWidth={2} aria-hidden />
      <span>{t('update.ready', { version })}</span>
      <button className="button is-primary" onClick={() => setInstalling(version)}>
        {t('update.restart')}
      </button>
      <button className="button is-ghost" onClick={() => setDismissed(true)}>
        {t('update.later')}
      </button>
    </aside>
  );
}
