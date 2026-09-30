import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { t } from '../i18n';
import { movePanel, NOTE_PANELS, PANEL_WIDTHS, panelsIn, type PanelId } from '../layout';
import { BookmarksPanel } from './BookmarkList';
import { useSession, useStore } from './hooks';
import { BacklinksPanel, OutgoingPanel, OutlinePanel, PropertiesPanel } from './NotePanels';
import { PANEL_DRAG } from './Panel';
import { usePreferences } from './preferences';
import { FilesPanel, SearchPanel } from './SearchPanel';
import { TagsPanel } from './TagList';

/** One panel by its id; the panels about a note need one. */
function PanelView({ id, notePath }: { id: PanelId; notePath: string | null }) {
  switch (id) {
    case 'search':
      return <SearchPanel />;
    case 'bookmarks':
      return <BookmarksPanel />;
    case 'files':
      return <FilesPanel />;
    case 'tags':
      return <TagsPanel />;
    case 'backlinks':
      return notePath ? <BacklinksPanel path={notePath} /> : null;
    case 'outline':
      return notePath ? <OutlinePanel path={notePath} /> : null;
    case 'outgoing':
      return notePath ? <OutgoingPanel path={notePath} /> : null;
    case 'properties':
      return notePath ? <PropertiesPanel path={notePath} /> : null;
  }
}

/**
 * A side of the workbench: its panels stacked in order. Panels dropped here by
 * their title move here; a narrow window shows it as a drawer over the notes.
 */
export function SideZone({ side, drawer }: { side: 'left' | 'right'; drawer: boolean }) {
  const session = useSession();
  const { preferences, update } = usePreferences();
  const layout = preferences.layout;
  const open = useStore(session.ui, (s) => (side === 'left' ? s.leftOpen : s.rightOpen));
  const query = useStore(session.ui, (s) => s.searchQuery);
  const reveal = useStore(session.ui, (s) => s.reveal);
  const notePath = useStore(session.workspace, () => (session.activeView?.type === 'note' ? session.activePath : null));
  const viewType = useStore(session.workspace, () => session.activeView?.type ?? 'empty');
  const [dropBefore, setDropBefore] = useState<PanelId | 'end' | null>(null);
  const zone = useRef<HTMLElement>(null);
  const ids = panelsIn(layout, side);

  // A panel asked for comes into view; the search field takes the keyboard.
  useEffect(() => {
    if (!reveal || !ids.includes(reveal.panel)) return;
    requestAnimationFrame(() => {
      const panel = zone.current?.querySelector<HTMLElement>(`[data-panel="${reveal.panel}"]`);
      panel?.scrollIntoView({ block: 'nearest' });
      if (reveal.panel === 'search') panel?.querySelector<HTMLInputElement>('input')?.focus();
    });
    // Only a new request moves the view, not a change of layout.
  }, [reveal]);

  if (!open || ids.length === 0) return null;

  const close = () => session.ui.setState(side === 'left' ? { leftOpen: false } : { rightOpen: false });
  // Searching: the results take the whole zone.
  const shown = query.trim() && ids.includes('search') ? (['search'] as PanelId[]) : ids;
  const notePanels = shown.filter((id) => NOTE_PANELS.includes(id));
  const otherPanels = shown.filter((id) => !NOTE_PANELS.includes(id));

  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes(PANEL_DRAG)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-panel]');
    setDropBefore((target?.dataset.panel as PanelId | undefined) ?? 'end');
  };
  const onDrop = (event: DragEvent) => {
    const id = event.dataTransfer.getData(PANEL_DRAG) as PanelId;
    setDropBefore(null);
    if (!id) return;
    event.preventDefault();
    update({ layout: movePanel(layout, id, side, dropBefore && dropBefore !== 'end' ? dropBefore : undefined) });
  };

  const style = { '--side-width': `${PANEL_WIDTHS[layout.width]}px` } as CSSProperties;
  return (
    <>
      {drawer && <div className="scrim" onClick={close} aria-hidden />}
      <aside
        ref={zone}
        className={`side is-${side}${drawer ? ' is-drawer' : ''}${dropBefore ? ' is-drop-target' : ''}`}
        style={style}
        aria-label={t(side === 'left' ? 'side.left' : 'side.right')}
        onDragOver={onDragOver}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropBefore(null)}
        onDrop={onDrop}
      >
        {shown.map((id) =>
          NOTE_PANELS.includes(id) && !notePath ? null : (
            <div key={id} className={`panel-slot${dropBefore === id ? ' is-drop-before' : ''}`}>
              <PanelView id={id} notePath={notePath} />
            </div>
          ),
        )}
        {notePanels.length > 0 && !notePath && (
          <p className="side-empty">{viewType !== 'empty' || otherPanels.length ? t('side.notNote') : t('empty.title')}</p>
        )}
      </aside>
    </>
  );
}
