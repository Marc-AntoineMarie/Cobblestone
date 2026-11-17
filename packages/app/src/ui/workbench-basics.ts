import { useEffect, type CSSProperties } from 'react';
import { t } from '../i18n';
import { LINE_WIDTHS } from '../settings';
import { applySnippets } from '../snippets';
import { registerAppCommands } from './app-commands';
import { useSession, useStore } from './hooks';
import { usePreferences } from './preferences';

/**
 * What every workbench needs, desktop or phone: the app's commands and shortcuts, the vault's CSS
 * snippets, and the text size and line width as style variables for its root.
 */
export function useWorkbenchBasics(onSwitchVault: () => void): CSSProperties {
  const session = useSession();
  const { preferences, update } = usePreferences();
  const textSize = useStore(session.settings, (s) => s.textSize);
  const lineWidth = useStore(session.settings, (s) => s.lineWidth);
  const snippets = useStore(session.settings, (s) => s.snippets);

  useEffect(
    () =>
      registerAppCommands(session, {
        switchVault: onSwitchVault,
        preferences: () => preferences,
        updatePreferences: update,
      }),
    [session, onSwitchVault, preferences, update],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      session.commands.handleKeydown(event);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  // The vault's CSS snippets, on top of the theme; they leave with the vault.
  useEffect(() => {
    void applySnippets(session.vault.adapter, snippets).then((failed) => {
      for (const path of failed) session.notify(t('settings.snippets.failed', { name: path.split('/').pop()! }), 'error');
    });
  }, [session, snippets]);
  useEffect(() => () => document.head.querySelectorAll('style[data-snippet]').forEach((el) => el.remove()), []);

  return { '--body': `${textSize}px`, '--line-width': LINE_WIDTHS[lineWidth] ?? LINE_WIDTHS.normal } as CSSProperties;
}
