import { useState } from 'react';
import { BookOpen, Files, Network, Search, Settings } from 'lucide-react';
import { t } from '../i18n';
import { ContextMenu } from './ContextMenu';
import { Finder } from './Finder';
import { GraphView } from './GraphView';
import { HoverPreview } from './HoverPreview';
import { useSession, useStore } from './hooks';
import { LayoutView } from './LayoutView';
import { PairingDialog } from './PairingDialog';
import { BookmarksPanel } from './BookmarkList';
import { BacklinksPanel, OutgoingPanel, OutlinePanel, PropertiesPanel } from './NotePanels';
import { FilesPanel, SearchPanel } from './SearchPanel';
import { SettingsView } from './SettingsView';
import { ShareSheet } from './ShareSheet';
import { TagsPanel } from './TagList';
import { Toasts } from './Toasts';
import { UpdateReady } from './UpdateReady';

type MobileTab = 'files' | 'note' | 'graph' | 'search' | 'settings';

/**
 * The workbench for phone-width screens (≤ 767 px): a single full-screen
 * view with a bottom navigation bar that switches between the main screens.
 */
export function MobileWorkbench({ onSwitchVault }: { onSwitchVault: () => void }) {
  const [tab, setTab] = useState<MobileTab>('note');
  const session = useSession();
  const openPath = useStore(session.workspace, (s) => {
    const pane = s.layout.type === 'pane' ? s.layout.pane : null;
    if (!pane) return null;
    const active = pane.tabs.find((t) => t.id === pane.activeTab);
    if (!active) return null;
    const v = active.view;
    return v.type === 'note' || v.type === 'file' ? v.path : null;
  });

  return (
    <div className="mobile-workbench">
      <div className="mobile-screen">
        {tab === 'files' && (
          <div className="mobile-panel-screen">
            <FilesPanel />
            <BookmarksPanel />
            <TagsPanel />
          </div>
        )}
        {tab === 'note' && (
          <div className="mobile-note-screen">
            <LayoutView />
          </div>
        )}
        {tab === 'graph' && (
          <div className="mobile-graph-screen">
            <GraphView visible={true} />
          </div>
        )}
        {tab === 'search' && (
          <div className="mobile-panel-screen">
            <SearchPanel />
            {openPath && (
              <>
                <BacklinksPanel path={openPath} />
                <OutgoingPanel path={openPath} />
                <OutlinePanel path={openPath} />
                <PropertiesPanel path={openPath} />
              </>
            )}
          </div>
        )}
        {tab === 'settings' && (
          <div className="mobile-settings-screen">
            <SettingsView />
          </div>
        )}
      </div>

      <nav className="mobile-nav" aria-label={t('mobile.nav')}>
        <MobileNavBtn id="files" active={tab === 'files'} label={t('mobile.nav.files')} onTap={() => setTab('files')}>
          <Files size={22} strokeWidth={1.75} aria-hidden />
        </MobileNavBtn>
        <MobileNavBtn id="note" active={tab === 'note'} label={t('mobile.nav.note')} onTap={() => setTab('note')}>
          <BookOpen size={22} strokeWidth={1.75} aria-hidden />
        </MobileNavBtn>
        <MobileNavBtn id="graph" active={tab === 'graph'} label={t('mobile.nav.graph')} onTap={() => setTab('graph')}>
          <Network size={22} strokeWidth={1.75} aria-hidden />
        </MobileNavBtn>
        <MobileNavBtn id="search" active={tab === 'search'} label={t('mobile.nav.search')} onTap={() => setTab('search')}>
          <Search size={22} strokeWidth={1.75} aria-hidden />
        </MobileNavBtn>
        <MobileNavBtn id="settings" active={tab === 'settings'} label={t('mobile.nav.settings')} onTap={() => setTab('settings')}>
          <Settings size={22} strokeWidth={1.75} aria-hidden />
        </MobileNavBtn>
      </nav>

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

function MobileNavBtn({
  id,
  active,
  label,
  onTap,
  children,
}: {
  id: string;
  active: boolean;
  label: string;
  onTap: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`mobile-nav-btn${active ? ' is-active' : ''}`}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={onTap}
      data-tab={id}
    >
      {children}
      <span className="mobile-nav-label">{label}</span>
    </button>
  );
}
