import { useEffect } from 'react';
import { t } from '../i18n';
import { setLayoutOption } from '../layout';
import { StatusBar } from './Bars';
import { ContextMenu } from './ContextMenu';
import { DeskList } from './DeskList';
import { Finder } from './Finder';
import { HoverPreview } from './HoverPreview';
import { useMediaQuery, useMobile, useSession, useStore } from './hooks';
import { LayoutView } from './LayoutView';
import { Marge } from './Marge';
import { MobileWorkbench } from './MobileWorkbench';
import { usePreferences } from './preferences';
import { PairingDialog } from './PairingDialog';
import { ShareSheet } from './ShareSheet';
import { Toasts } from './Toasts';
import { UpdateReady } from './UpdateReady';
import { useWorkbenchBasics } from './workbench-basics';

/**
 * The open vault: the list of notes on the left, the notes in the middle, the
 * margin on the right, and the floating layers. What shows is a preference of
 * the device (see layout.ts).
 */
export function Workbench({ onSwitchVault }: { onSwitchVault: () => void }) {
  const mobile = useMobile();
  // Touch tablets (768 to 1180 px): the list on the left, the note on the right. With a mouse, the desktop.
  const tablet = useMediaQuery('(min-width: 768px) and (max-width: 1180px) and (pointer: coarse)');
  if (mobile || tablet) return <MobileWorkbench onSwitchVault={onSwitchVault} split={!mobile} />;
  return <DesktopWorkbench onSwitchVault={onSwitchVault} />;
}

function DesktopWorkbench({ onSwitchVault }: { onSwitchVault: () => void }) {
  const session = useSession();
  const { preferences, update } = usePreferences();
  const style = useWorkbenchBasics(onSwitchVault);
  const layout = preferences.layout;
  // Under 1000 px the list lies over the notes instead of beside them.
  const narrow = useMediaQuery('(max-width: 1000px)');
  const reveal = useStore(session.ui, (s) => s.reveal);
  const revealSeq = reveal?.seq;

  // A part of the list asked for elsewhere brings the list back.
  useEffect(() => {
    if (reveal && ['files', 'tags', 'bookmarks'].includes(reveal.panel) && !layout.list) {
      update({ layout: setLayoutOption(layout, 'list', true) });
    }
    // Only a new request opens the list, not a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealSeq]);

  const closeList = () => update({ layout: setLayoutOption(layout, 'list', false) });

  return (
    <div className="workbench" data-list={layout.list ? (narrow ? 'drawer' : 'docked') : 'closed'} style={style}>
      <div className="workbench-body">
        {layout.list && narrow && <div className="scrim" onClick={closeList} aria-hidden />}
        {layout.list && <DeskList width={layout.width} onSwitchVault={onSwitchVault} />}
        {!layout.list && (
          <button
            className="list-handle"
            aria-label={t('list.show')}
            title={t('list.show')}
            onClick={() => update({ layout: setLayoutOption(layout, 'list', true) })}
          >
            <span aria-hidden />
          </button>
        )}
        <main className="sheets" id="sheets">
          <LayoutView />
        </main>
        {layout.margin && <Marge rail={layout.rail} width={layout.width} />}
      </div>
      {layout.statusBar && <StatusBar />}
      <Finder />
      <ContextMenu />
      <ShareSheet />
      <PairingDialog />
      <HoverPreview />
      <Toasts />
      <UpdateReady platform={session.platform} />
    </div>
  );
}
