import type { DragEvent, MouseEvent, ReactNode } from 'react';
import { Bookmark, ChevronRight, FolderTree, Hash, Link2, ListTree, Search, Tags, Undo2, type LucideIcon } from 'lucide-react';
import { t, type MessageKey } from '../i18n';
import { movePanel, type PanelId } from '../layout';
import { useSession, useStore } from './hooks';
import { usePreferences } from './preferences';

/** The name and icon of each panel. */
export const PANEL_INFO: Record<PanelId, { label: MessageKey; icon: LucideIcon }> = {
  search: { label: 'panel.search', icon: Search },
  bookmarks: { label: 'rail.bookmarks', icon: Bookmark },
  files: { label: 'rail.notes', icon: FolderTree },
  tags: { label: 'rail.tags', icon: Tags },
  backlinks: { label: 'margin.backlinks', icon: Undo2 },
  outline: { label: 'margin.outline', icon: ListTree },
  outgoing: { label: 'margin.outgoing', icon: Link2 },
  properties: { label: 'margin.properties', icon: Hash },
};

export const panelLabel = (id: PanelId) => t(PANEL_INFO[id].label);

/** Drag data of a panel being moved by its title. */
export const PANEL_DRAG = 'application/x-cobblestone-panel';

/**
 * A panel of a side zone: a title that folds it, its actions, then its body.
 * The title can be dragged to the other zone; its menu moves or hides it.
 */
export function Panel({
  id,
  count,
  actions,
  grow,
  children,
}: {
  id: PanelId;
  /** Shown after the title. */
  count?: number;
  actions?: ReactNode;
  /** The body takes the height left in its zone (and scrolls inside). */
  grow?: boolean;
  children: ReactNode;
}) {
  const session = useSession();
  const { preferences, update } = usePreferences();
  const layout = preferences.layout;
  const collapsed = useStore(session.ui, (s) => !!s.collapsed[id]);
  const toggle = () => session.ui.setState((s) => ({ collapsed: { ...s.collapsed, [id]: !collapsed } }));

  const menu = (event: MouseEvent) => {
    event.preventDefault();
    const zone = layout.zones[id];
    const other = zone === 'left' ? 'right' : 'left';
    // Up and down among the panels shown, not the empty ones (no bookmarks yet, say).
    const shown = [...((event.currentTarget as HTMLElement).closest('.side')?.querySelectorAll<HTMLElement>('.panel') ?? [])].map(
      (el) => el.dataset.panel as PanelId,
    );
    const at = shown.indexOf(id);
    const previous = shown[at - 1];
    const next = shown[at + 1];
    session.ui.setState({
      menu: {
        x: event.clientX,
        y: event.clientY,
        items: [
          {
            label: t(other === 'left' ? 'panel.moveLeft' : 'panel.moveRight'),
            run: () => update({ layout: movePanel(layout, id, other) }),
          },
          ...(previous ? [{ label: t('panel.up'), run: () => update({ layout: movePanel(layout, id, zone, previous) }) }] : []),
          ...(next
            ? [{ label: t('panel.down'), run: () => update({ layout: movePanel(layout, id, zone, shown[at + 2]) }) }]
            : []),
          { label: t('panel.hide'), run: () => update({ layout: movePanel(layout, id, 'hidden') }) },
        ],
      },
    });
  };

  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData(PANEL_DRAG, id);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <section
      className={`panel${collapsed ? ' is-collapsed' : ''}${grow && !collapsed ? ' is-grow' : ''}`}
      data-panel={id}
      aria-labelledby={`panel-${id}`}
    >
      <header className="panel-head" draggable onDragStart={onDragStart} onContextMenu={menu}>
        <button className="label section-toggle" id={`panel-${id}`} aria-expanded={!collapsed} onClick={toggle}>
          <ChevronRight size={12} strokeWidth={2.25} className={collapsed ? undefined : 'is-open'} aria-hidden />
          {panelLabel(id)}
          {count !== undefined && <span className="count">{count}</span>}
        </button>
        {actions && !collapsed && <div className="panel-actions">{actions}</div>}
      </header>
      {!collapsed && <div className="panel-body">{children}</div>}
    </section>
  );
}
