import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { t } from '../i18n';
import type { Platform } from '../platform';

/** Key in `platform.storage`: the version the app is restarting into, read back once relaunched. */
export const PENDING_UPDATE_KEY = 'update.pendingVersion';

const INSTALL_DELAY = 900;

/**
 * Full-screen notice shown for a moment before the app quits to install the
 * update, so the freeze and relaunch that follow never look like a crash.
 */
export function UpdateInstalling({ version, platform }: { version: string; platform: Platform }) {
  useEffect(() => {
    void platform.storage.set(PENDING_UPDATE_KEY, version);
    const id = setTimeout(() => platform.updates?.install(), INSTALL_DELAY);
    return () => clearTimeout(id);
  }, [version, platform]);
  return (
    <div className="update-installing" role="status">
      <RefreshCw size={28} strokeWidth={2} className="update-turning" aria-hidden />
      <p>{t('update.installing', { version })}</p>
    </div>
  );
}
