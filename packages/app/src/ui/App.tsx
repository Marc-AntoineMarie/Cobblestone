import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { appearanceTokens, applyTokens, paperOf, themeFor } from '../appearance';
import { describeError, isVaultMissing } from '../errors';
import { normalizeLayout } from '../layout';
import { detectLanguage, setLanguage } from '../i18n';
import type { Platform, VaultEntry } from '../platform';
import type { Session } from '../session';
import { DEFAULT_PREFERENCES, type Preferences } from '../settings';
import { PreferencesContext } from './preferences';
import { SessionContext, useMediaQuery } from './hooks';
import { Launcher } from './Launcher';
import { LostVault } from './LostVault';
import { UpdateReady } from './UpdateReady';

// The workspace (editor, index, renderers) loads only once a vault opens: the first screen stays light.
const Workbench = lazy(() => import('./Workbench').then((m) => ({ default: m.Workbench })));

const LAST_VAULT = 'lastVault';

export function App({ platform }: { platform: Platform }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [session, setSession] = useState<Session | null>(null);
  const [opening, setOpening] = useState<VaultEntry | null>(null);
  /** Notes read so far while a vault opens. */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  /** The opening in progress, so it can be cancelled. */
  const opener = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** A vault whose folder is gone: renamed, moved or deleted outside the app. */
  const [lost, setLost] = useState<VaultEntry | null>(null);
  /** Each opening gets a fresh workbench, even when the same vault reopens. */
  const [generation, setGeneration] = useState(0);
  const [booted, setBooted] = useState(false);
  const systemNight = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = themeFor(preferences, paperOf(preferences, systemNight));
  // The theme decides the stock: a dark theme prints on night paper.
  const paper = theme.scheme === 'dark' ? 'night' : 'day';
  const language = preferences.language === 'auto' ? detectLanguage() : preferences.language;
  setLanguage(language);
  const appliedTokens = useRef<string[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.paper = paper;
    root.style.colorScheme = paper === 'night' ? 'dark' : 'light';
    root.lang = language;
    appliedTokens.current = applyTokens(root, appearanceTokens(preferences, theme), appliedTokens.current);
  }, [paper, language, preferences, theme]);

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
      opener.current?.abort();
      const controller = new AbortController();
      opener.current = controller;
      setOpening(entry);
      setProgress(null);
      setError(null);
      setLost(null);
      try {
        const [adapter, { Session }] = await Promise.all([platform.openVault(entry), import('../session')]);
        controller.signal.throwIfAborted();
        const next = await Session.open(platform, entry, adapter, {
          signal: controller.signal,
          onProgress: (done, total) => setProgress({ done, total }),
        });
        if (controller.signal.aborted) return next.dispose();
        setSession((previous) => {
          previous?.dispose();
          return next;
        });
        setGeneration((g) => g + 1);
        // The vault is open: failing to remember it for next launch is not an opening error.
        void platform.storage.set(LAST_VAULT, entry.id).catch((e: unknown) => console.error('Could not save the last vault', e));
      } catch (e) {
        if (controller.signal.aborted) return; // cancelled by the user: nothing to report
        if (isVaultMissing(e)) setLost(entry);
        else setError(describeError(e));
      } finally {
        if (opener.current === controller) {
          opener.current = null;
          setOpening(null);
          setProgress(null);
        }
      }
    },
    [platform],
  );

  /** Stops an opening that takes too long (a huge folder, a slow drive). */
  const cancelOpening = useCallback(() => {
    opener.current?.abort();
    opener.current = null;
    setOpening(null);
    setProgress(null);
  }, []);

  const closeVault = useCallback(() => {
    setSession((current) => {
      current?.dispose();
      return null;
    });
    void platform.storage.set(LAST_VAULT, null);
  }, [platform]);

  // The folder of the open vault was renamed, moved or deleted in another app.
  useEffect(() => {
    if (!session || !platform.onVaultMissing) return;
    return platform.onVaultMissing((vaultId, missing) => {
      if (vaultId !== session.entry.id) return;
      if (missing) return setLost(session.entry);
      // Back in place: reopen it so its changes are watched again.
      setLost(null);
      void openEntry(session.entry);
    });
  }, [platform, session, openEntry]);

  // Restore preferences and reopen the last vault when that needs no permission prompt.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await platform.storage.get<Preferences>('preferences');
      if (!cancelled && stored) setPreferences({ ...DEFAULT_PREFERENCES, ...stored, layout: normalizeLayout(stored.layout) });
      const lastId = await platform.storage.get<string | null>(LAST_VAULT);
      const entry = lastId ? (await platform.recentVaults()).find((v) => v.id === lastId) : undefined;
      const reopenable = entry && (platform.kind === 'desktop' || entry.kind === 'browser');
      if (!cancelled && reopenable) {
        // A quick reopening shows the vault directly; a slow one shows the launcher, with its progress and Cancel.
        const reveal = setTimeout(() => !cancelled && setBooted(true), 400);
        await openEntry(entry);
        clearTimeout(reveal);
      }
      if (!cancelled) setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [platform, openEntry]);

  return (
    <PreferencesContext.Provider value={{ preferences, update: updatePreferences, paper, theme }}>
      {session ? (
        <SessionContext.Provider value={session}>
          <Suspense fallback={null}>
            <Workbench key={generation} onSwitchVault={closeVault} />
          </Suspense>
          {lost && (
            <div className="lost-layer">
              <LostVault
                platform={platform}
                entry={lost}
                inWorkspace
                onFollow={(entry) => void openEntry(entry)}
                onClose={() => {
                  setLost(null);
                  closeVault();
                }}
              />
            </div>
          )}
        </SessionContext.Provider>
      ) : booted ? (
        <Launcher
          platform={platform}
          opening={opening}
          progress={progress}
          onCancelOpening={cancelOpening}
          error={error}
          lost={lost}
          onOpen={(entry) => void openEntry(entry)}
          onLostClose={() => setLost(null)}
        />
      ) : null}
      <UpdateReady platform={platform} />
    </PreferencesContext.Provider>
  );
}
