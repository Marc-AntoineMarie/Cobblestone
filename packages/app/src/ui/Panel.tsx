import { createContext, useContext, type ReactNode } from 'react';
import { Hash, Link2, ListTree, Network, Undo2, type LucideIcon } from 'lucide-react';
import { t, type MessageKey } from '../i18n';
import type { MarginTab } from '../layout';

/** What a panel is about; the margin's rail shows one button per tab. */
export type PanelKind = 'backlinks' | 'outline' | 'outgoing' | 'properties';

/** The name and icon of each panel. */
export const PANEL_INFO: Record<PanelKind, { label: MessageKey; icon: LucideIcon }> = {
  backlinks: { label: 'margin.backlinks', icon: Undo2 },
  outline: { label: 'margin.outline', icon: ListTree },
  outgoing: { label: 'margin.outgoing', icon: Link2 },
  properties: { label: 'margin.properties', icon: Hash },
};

/** The name and icon of each button of the margin's rail. */
export const MARGIN_INFO: Record<MarginTab, { label: MessageKey; icon: LucideIcon }> = {
  links: { label: 'margin.links', icon: Link2 },
  outline: { label: 'margin.outline', icon: ListTree },
  properties: { label: 'margin.properties', icon: Hash },
  graph: { label: 'margin.graph', icon: Network },
};

/** False inside a container that names the panel itself (the phone's note sheet): body only. */
export const PanelChrome = createContext(true);

export const panelLabel = (id: PanelKind) => t(PANEL_INFO[id].label);
export const marginLabel = (id: MarginTab) => t(MARGIN_INFO[id].label);

/** A panel: its title with a count, then its body. */
export function Panel({
  id,
  count,
  actions,
  grow,
  children,
}: {
  id: PanelKind;
  /** Shown after the title. */
  count?: number;
  actions?: ReactNode;
  /** The body takes the height left (and scrolls inside). */
  grow?: boolean;
  children: ReactNode;
}) {
  const chrome = useContext(PanelChrome);
  if (!chrome) {
    return (
      <section className="panel is-bare" data-panel={id}>
        <div className="panel-body">{children}</div>
      </section>
    );
  }
  return (
    <section className={`panel${grow ? ' is-grow' : ''}`} data-panel={id} aria-labelledby={`panel-${id}`}>
      <header className="panel-head">
        <h2 className="label" id={`panel-${id}`}>
          {panelLabel(id)}
          {count !== undefined && <span className="count">{count}</span>}
        </h2>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
