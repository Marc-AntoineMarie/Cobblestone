import { useEffect, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { t } from '../i18n';
import { PANEL_WIDTHS, type MarginTab, type PanelWidth } from '../layout';
import { GraphView } from './GraphView';
import { useSession, useStore } from './hooks';
import { useLinkCounts } from './MobileNoteSheet';
import { BacklinksPanel, OutgoingPanel, OutlinePanel, PropertiesPanel } from './NotePanels';
import { MARGIN_INFO, marginLabel } from './Panel';

/**
 * The margin, down the right of the workbench: a rail of buttons, and the one
 * panel the open button shows. Everything in it is about the note in view.
 */
export function Marge({ rail, width }: { rail: MarginTab[]; width: PanelWidth }) {
  const session = useSession();
  const [open, setOpen] = useState<MarginTab | null>(null);
  const notePath = useStore(session.workspace, () => (session.activeView?.type === 'note' ? session.activePath : null));
  const counts = useLinkCounts(notePath ?? '');
  const reveal = useStore(session.ui, (s) => s.reveal);
  const revealSeq = reveal?.seq;

  // A panel asked for elsewhere (a command, the status bar, a bookmark) opens here.
  useEffect(() => {
    if (reveal && rail.includes(reveal.panel as MarginTab)) setOpen(reveal.panel as MarginTab);
    // Only a new request opens a panel, not a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealSeq]);

  const shown = open && rail.includes(open) ? open : null;
  const style = { '--margin-width': `${PANEL_WIDTHS[width]}px` } as CSSProperties;

  return (
    <div className={`marge${shown ? ' is-open' : ''}`} style={style}>
      {shown && (
        <section className="marge-panel" aria-label={marginLabel(shown)}>
          <header className="marge-head">
            <h2>{marginLabel(shown)}</h2>
            <button
              className="icon-button"
              aria-label={t('margin.close')}
              title={t('margin.close')}
              onClick={() => setOpen(null)}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </header>
          <div className={`marge-body is-${shown}`}>
            {notePath ? <MarginContent tab={shown} path={notePath} /> : <p className="side-empty">{t('side.notNote')}</p>}
          </div>
        </section>
      )}
      <nav className="marge-rail" aria-label={t('margin.label')}>
        {rail.map((id) => {
          const Icon = MARGIN_INFO[id].icon;
          const count = id === 'links' ? counts.backlinks + counts.outgoing : undefined;
          return (
            <button
              key={id}
              className={`marge-button${shown === id ? ' is-on' : ''}`}
              data-tab={id}
              aria-pressed={shown === id}
              aria-label={count === undefined ? marginLabel(id) : `${marginLabel(id)} ${count}`}
              title={marginLabel(id)}
              onClick={() => setOpen(shown === id ? null : id)}
            >
              <Icon size={19} strokeWidth={1.75} aria-hidden />
              {count !== undefined && count > 0 && (
                <span className="marge-count" aria-hidden>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function MarginContent({ tab, path }: { tab: MarginTab; path: string }) {
  switch (tab) {
    case 'links':
      return (
        <>
          <BacklinksPanel path={path} />
          <OutgoingPanel path={path} />
        </>
      );
    case 'outline':
      return <OutlinePanel path={path} />;
    case 'properties':
      return <PropertiesPanel path={path} />;
    case 'graph':
      return <GraphView focus={path} visible />;
  }
}
