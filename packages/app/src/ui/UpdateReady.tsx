import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { t } from '../i18n';
import type { Platform } from '../platform';

/** A newer version was downloaded: restart into it now, or later (it installs on quit). */
export function UpdateReady({ platform }: { platform: Platform }) {
  const [version, setVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!platform.updates) return;
    void platform.updates.ready().then((v) => v && setVersion(v));
    return platform.updates.onReady(setVersion);
  }, [platform]);
  if (!version || dismissed || !platform.updates) return null;
  return (
    <aside className="update-ready" role="status">
      <RefreshCw size={15} strokeWidth={2} aria-hidden />
      <span>{t('update.ready', { version })}</span>
      <button className="button is-primary" onClick={() => platform.updates!.install()}>
        {t('update.restart')}
      </button>
      <button className="button is-ghost" onClick={() => setDismissed(true)}>
        {t('update.later')}
      </button>
    </aside>
  );
}
