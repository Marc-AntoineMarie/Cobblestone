import { useEffect } from 'react';
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

  // Narrow windows start with the drawers closed.
  useEffect(() => {
    if (narrow) session.ui.setState({ railOpen: false, marginOpen: false });
  }, [narrow, session]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      session.commands.handleKeydown(event);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  const marginMode = wide ? 'docked' : 'drawer';

  return (
    <div className="workbench" data-rail={railOpen ? 'open' : 'closed'} data-margin={marginOpen ? marginMode : 'closed'}>
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
