import { useEffect, type CSSProperties } from 'react';
import { t } from '../i18n';
import { LINE_WIDTHS } from '../settings';
import { applySnippets } from '../snippets';
import { registerAppCommands } from './app-commands';
import { ContextMenu } from './ContextMenu';
import { Finder } from './Finder';
import { HoverPreview } from './HoverPreview';
import { useMediaQuery, useSession, useStore } from './hooks';
import { LayoutView } from './LayoutView';
import { Marginalia } from './Marginalia';
import { usePreferences } from './preferences';
import { Rail } from './Rail';
import { ShareSheet } from './ShareSheet';
import { Toasts } from './Toasts';

/** The open vault: stack rail, sheets, marginalia, and the floating layers. */
export function Workbench({ onSwitchVault }: { onSwitchVault: () => void }) {
  const session = useSession();
  const { preferences, update } = usePreferences();
  const railOpen = useStore(session.ui, (s) => s.railOpen);
  const marginOpen = useStore(session.ui, (s) => s.marginOpen);
  const textSize = useStore(session.settings, (s) => s.textSize);
  const lineWidth = useStore(session.settings, (s) => s.lineWidth);
  const snippets = useStore(session.settings, (s) => s.snippets);
  const wide = useMediaQuery('(min-width: 1180px)');
  const narrow = useMediaQuery('(max-width: 760px)');

  useEffect(
    () =>
      registerAppCommands(session, {
        switchVault: onSwitchVault,
        preferences: () => preferences,
        updatePreferences: update,
      }),
    [session, onSwitchVault, preferences, update],
  );

  // Narrow windows start with the drawers closed; below 1180 px the margin is a drawer, closed until asked for.
  useEffect(() => {
    if (narrow) session.ui.setState({ railOpen: false, marginOpen: false });
    else if (!wide) session.ui.setState({ marginOpen: false });
  }, [narrow, wide, session]);

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

  const marginMode = wide ? 'docked' : 'drawer';

  return (
    <div
      className="workbench"
      data-rail={railOpen ? 'open' : 'closed'}
      data-margin={marginOpen ? marginMode : 'closed'}
      style={{ '--body': `${textSize}px`, '--line-width': LINE_WIDTHS[lineWidth] ?? LINE_WIDTHS.normal } as CSSProperties}
    >
      <Rail onSwitchVault={onSwitchVault} drawer={narrow} />
      <main className="sheets" id="sheets">
        <LayoutView />
      </main>
      {marginOpen && <Marginalia drawer={!wide} />}
      <Finder />
      <ContextMenu />
      <ShareSheet />
      <HoverPreview />
      <Toasts />
    </div>
  );
}
