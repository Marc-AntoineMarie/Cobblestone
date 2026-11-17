import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { GraphView } from './GraphView';
import { useNoteRevision, useSession } from './hooks';
import { BacklinksPanel, OutgoingPanel, OutlinePanel, PropertiesPanel } from './NotePanels';
import { PanelChrome, panelLabel } from './Panel';

export type SheetTab = 'backlinks' | 'outgoing' | 'outline' | 'properties' | 'graph';

/** How many notes link here, and how many this one links to: the counts the sheet's tabs show. */
export function useLinkCounts(path: string) {
  const session = useSession();
  useNoteRevision(path);
  const cache = session.vault.cache;
  return {
    backlinks: cache.getBacklinks(path).length,
    outgoing: [...cache.getResolvedLinks(path).keys()].filter((p) => p !== path).length + cache.getUnresolvedLinks(path).size,
  };
}

/**
 * What the desktop shows in its margin, on the phone: one sheet rising from the bottom, a tab per
 * panel. It stops at half height or fills the screen; dragging its handle down closes it.
 */
export function MobileNoteSheet({
  path,
  tab,
  onTab,
  onClose,
}: {
  path: string;
  tab: SheetTab;
  onTab: (tab: SheetTab) => void;
  onClose: () => void;
}) {
  const counts = useLinkCounts(path);
  const [full, setFull] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [tab]);

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (start.current !== null) setDrag(e.clientY - start.current);
  };
  const onPointerUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (drag > 80) {
      if (full) setFull(false);
      else onClose();
    } else if (drag < -60) setFull(true);
    else if (Math.abs(drag) < 6) setFull((f) => !f);
    setDrag(0);
  };

  const tabs: { id: SheetTab; label: string }[] = [
    { id: 'backlinks', label: `${panelLabel('backlinks')} ${counts.backlinks}` },
    { id: 'outgoing', label: `${panelLabel('outgoing')} ${counts.outgoing}` },
    { id: 'outline', label: panelLabel('outline') },
    { id: 'properties', label: panelLabel('properties') },
    { id: 'graph', label: t('graph.title') },
  ];

  return (
    <>
      <div className="mobile-scrim" onClick={onClose} />
      <section
        className={`mobile-sheet${full ? ' is-full' : ''}${drag ? ' is-dragging' : ''}`}
        style={drag ? { transform: `translateY(${Math.max(drag, full ? 0 : -200)}px)` } : undefined}
        role="dialog"
        aria-label={t('mobile.sheet')}
      >
        <button
          className="mobile-sheet-handle"
          aria-label={full ? t('mobile.sheet.half') : t('mobile.sheet.full')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span />
        </button>
        <div className="mobile-sheet-tabs" role="tablist" ref={tabsRef}>
          {tabs.map((item) => (
            <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => onTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className={`mobile-sheet-body is-${tab}`} role="tabpanel">
          <PanelChrome.Provider value={false}>
            {tab === 'backlinks' && <BacklinksPanel path={path} />}
            {tab === 'outgoing' && <OutgoingPanel path={path} />}
            {tab === 'outline' && <OutlinePanel path={path} />}
            {tab === 'properties' && <PropertiesPanel path={path} />}
            {tab === 'graph' && <GraphView focus={path} visible />}
          </PanelChrome.Provider>
        </div>
      </section>
    </>
  );
}
