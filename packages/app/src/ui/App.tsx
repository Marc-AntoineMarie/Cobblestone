import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { describeError } from '../errors';
import { detectLanguage, setLanguage } from '../i18n';
import type { Platform, VaultEntry } from '../platform';
import type { Session } from '../session';
import { DEFAULT_PREFERENCES, type Preferences } from '../settings';
import { PreferencesContext } from './preferences';
import { SessionContext, useMediaQuery } from './hooks';
import { Launcher } from './Launcher';

// The workspace (editor, index, renderers) loads only once a vault opens: the first screen stays light.
const Workbench = lazy(() => import('./Workbench').then((m) => ({ default: m.Workbench })));

const LAST_VAULT = 'lastVault';

export function App({ platform }: { platform: Platform }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [session, setSession] = useState<Session | null>(null);
  const [opening, setOpening] = useState<VaultEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const systemNight = useMediaQuery('(prefers-color-scheme: dark)');

  const paper = preferences.theme === 'system' ? (systemNight ? 'night' : 'day') : preferences.theme;
  const language = preferences.language === 'auto' ? detectLanguage() : preferences.language;
  setLanguage(language);

  useEffect(() => {
    document.documentElement.dataset.paper = paper;
    document.documentElement.style.colorScheme = paper === 'night' ? 'dark' : 'light';
    document.documentElement.lang = language;
  }, [paper, language]);

  const updatePreferences = useCallback(
    (patch: Partial<Preferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...patch };
        void platform.storage.set('preferences', next);
        return next;
      });
    },
    [platform],
  );

  const openEntry = useCallback(
    async (entry: VaultEntry) => {
      setOpening(entry);
      setError(null);
      try {
        const [adapter, { Session }] = await Promise.all([platform.openVault(entry), import('../session')]);
        const next = await Session.open(platform, entry, adapter);
        setSession((previous) => {
          previous?.dispose();
          return next;
        });
        // The vault is open: failing to remember it for next launch is not an opening error.
        void platform.storage.set(LAST_VAULT, entry.id).catch((e: unknown) => console.error('Could not save the last vault', e));
      } catch (e) {
        setError(describeError(e));
      } finally {
        setOpening(null);
      }
    },
    [platform],
  );

  const closeVault = useCallback(() => {
    setSession((current) => {
      current?.dispose();
      return null;
    });
    void platform.storage.set(LAST_VAULT, null);
  }, [platform]);

  // Restore preferences and reopen the last vault when that needs no permission prompt.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await platform.storage.get<Preferences>('preferences');
      if (!cancelled && stored) setPreferences({ ...DEFAULT_PREFERENCES, ...stored });
      const lastId = await platform.storage.get<string | null>(LAST_VAULT);
      const entry = lastId ? (await platform.recentVaults()).find((v) => v.id === lastId) : undefined;
      const reopenable = entry && (platform.kind === 'desktop' || entry.kind === 'browser');
      if (!cancelled && reopenable) await openEntry(entry);
      if (!cancelled) setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [platform, openEntry]);

  return (
    <PreferencesContext.Provider value={{ preferences, update: updatePreferences, paper }}>
      {session ? (
        <SessionContext.Provider value={session}>
          <Suspense fallback={null}>
            <Workbench key={session.entry.id} onSwitchVault={closeVault} />
          </Suspense>
        </SessionContext.Provider>
      ) : booted ? (
        <Launcher platform={platform} opening={opening} error={error} onOpen={(entry) => void openEntry(entry)} />
      ) : null}
    </PreferencesContext.Provider>
  );
}
