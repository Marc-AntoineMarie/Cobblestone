import { useEffect } from 'react';
import { movePanel, PRESETS } from '../layout';
import { ActivityBar, StatusBar, TopBar } from './Bars';
import { ContextMenu } from './ContextMenu';
import { Finder } from './Finder';
import { HoverPreview } from './HoverPreview';
import { useMediaQuery, useMobile, useSession, useStore } from './hooks';
import { LayoutView } from './LayoutView';
import { MobileWorkbench } from './MobileWorkbench';
import { usePreferences } from './preferences';
import { PairingDialog } from './PairingDialog';
import { ShareSheet } from './ShareSheet';
import { SideZone } from './SideZone';
import { Toasts } from './Toasts';
import { useWorkbenchBasics } from './workbench-basics';

/**
 * The open vault: the top bar, the activity bar, the side zones around the
 * sheets, the status bar, and the floating layers. Where each panel goes is a
 * preference of the device (see layout.ts).
 */
export function Workbench({ onSwitchVault }: { onSwitchVault: () => void }) {
  const mobile = useMobile();
  if (mobile) return <MobileWorkbench onSwitchVault={onSwitchVault} />;
  return <DesktopWorkbench onSwitchVault={onSwitchVault} />;
}

function DesktopWorkbench({ onSwitchVault }: { onSwitchVault: () => void }) {
  const session = useSession();
  const { preferences, update } = usePreferences();
  const leftOpen = useStore(session.ui, (s) => s.leftOpen);
  const rightOpen = useStore(session.ui, (s) => s.rightOpen);
  const style = useWorkbenchBasics(onSwitchVault);
  const reveal = useStore(session.ui, (s) => s.reveal);
  const wide = useMediaQuery('(min-width: 1180px)');
  const narrow = useMediaQuery('(max-width: 760px)');
  const layout = preferences.layout;

  // A panel asked for: its zone opens; a hidden panel goes back to its classic side.
  useEffect(() => {
    if (!reveal) return;
    let zone = layout.zones[reveal.panel];
    if (zone === 'hidden') {
      zone = PRESETS.classic.zones[reveal.panel];
      update({ layout: movePanel(layout, reveal.panel, zone) });
    }
    session.ui.setState(zone === 'left' ? { leftOpen: true } : { rightOpen: true });
    // Only a new request, not a change of layout.
  }, [reveal]);

  // Narrow windows start with the drawers closed; below 1180 px the right zone is a drawer, closed until asked for.
  useEffect(() => {
    if (narrow) session.ui.setState({ leftOpen: false, rightOpen: false });
    else if (!wide) session.ui.setState({ rightOpen: false });
  }, [narrow, wide, session]);

  return (
    <div
      className="workbench"
      data-left={leftOpen ? (narrow ? 'drawer' : 'docked') : 'closed'}
      data-right={rightOpen ? (wide ? 'docked' : 'drawer') : 'closed'}
      style={style}
    >
      <TopBar onSwitchVault={onSwitchVault} />
      <div className="workbench-body">
        {layout.activityBar && !narrow && <ActivityBar />}
        <SideZone side="left" drawer={narrow} />
        <main className="sheets" id="sheets">
          <LayoutView />
        </main>
        <SideZone side="right" drawer={!wide} />
      </div>
      {layout.statusBar && <StatusBar />}
      <Finder />
      <ContextMenu />
      <ShareSheet />
      <PairingDialog />
      <HoverPreview />
      <Toasts />
    </div>
  );
}
