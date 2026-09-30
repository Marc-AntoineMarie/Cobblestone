import { useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { FileText, LayoutDashboard, Network, Pin, Plus, Settings2, X, File } from 'lucide-react';
import { CanvasView } from '../canvas/CanvasView';
import { basename, stem } from '@cobblestone/core';
import { t } from '../i18n';
import {
  activate,
  closeTab,
  moveTab,
  open,
  resizeSplit,
  togglePin,
  type Layout,
  type Pane,
  type Tab,
  type ViewState,
} from '../workspace/workspace';
import { EmptyView } from './EmptyView';
import { FileView } from './FileView';
import { GraphView } from './GraphView';
import { useSession, useStore } from './hooks';
import { NoteView } from './NoteView';
import { usePreferences } from './preferences';
import { SettingsView } from './SettingsView';

export function LayoutView() {
  const session = useSession();
  const layout = useStore(session.workspace, (s) => s.layout);
  return <LayoutNode node={layout} />;
}

function LayoutNode({ node }: { node: Layout }) {
  if (node.type === 'pane') return <PaneView pane={node.pane} />;
  return <SplitView node={node} />;
}

function SplitView({ node }: { node: Extract<Layout, { type: 'split' }> }) {
  const session = useSession();
  const ref = useRef<HTMLDivElement>(null);

  const startResize = (index: number) => (event: ReactPointerEvent) => {
    event.preventDefault();
    const container = ref.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const total = node.direction === 'row' ? rect.width : rect.height;
    const startSizes = [...node.sizes];
    const origin = node.direction === 'row' ? event.clientX : event.clientY;
    const onMove = (e: PointerEvent) => {
      const delta = ((node.direction === 'row' ? e.clientX : e.clientY) - origin) / total;
      const a = Math.max(0.12, startSizes[index]! + delta);
      const b = Math.max(0.12, startSizes[index]! + startSizes[index + 1]! - a);
      const sizes = [...startSizes];
      sizes[index] = startSizes[index]! + startSizes[index + 1]! - b;
      sizes[index + 1] = b;
      session.workspace.setState((s) => resizeSplit(s, node.id, sizes));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('is-resizing');
    };
    document.body.classList.add('is-resizing');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className={`split is-${node.direction}`} ref={ref}>
      {node.children.map((child, i) => (
        <div
          key={child.type === 'pane' ? child.pane.id : child.id}
          className="split-cell"
          style={{ flexGrow: node.sizes[i] ?? 1 }}
        >
          <LayoutNode node={child} />
          {i < node.children.length - 1 && (
            <div
              className="split-handle"
              role="separator"
              aria-orientation={node.direction === 'row' ? 'vertical' : 'horizontal'}
              onPointerDown={startResize(i)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function viewTitle(view: ViewState): string {
  switch (view.type) {
    case 'note':
      return stem(view.path);
    case 'file':
      return basename(view.path);
    case 'canvas':
      return stem(view.path);
    case 'graph':
      return view.focus ? `${t('graph.title')} · ${stem(view.focus)}` : t('graph.title');
    case 'settings':
      return t('settings.title');
    case 'empty':
      return t('empty.title');
  }
}

function TabIcon({ view }: { view: ViewState }) {
  const props = { size: 14, strokeWidth: 1.75, 'aria-hidden': true } as const;
  if (view.type === 'note') return <FileText {...props} />;
  if (view.type === 'graph') return <Network {...props} />;
  if (view.type === 'settings') return <Settings2 {...props} />;
  if (view.type === 'file') return <File {...props} />;
  if (view.type === 'canvas') return <LayoutDashboard {...props} />;
  return null;
}

function PaneView({ pane }: { pane: Pane }) {
  const session = useSession();
  const activePane = useStore(session.workspace, (s) => s.activePane);
  const isActive = activePane === pane.id;
  const [dragOver, setDragOver] = useState<number | null>(null);
  const showTabs = usePreferences().preferences.layout.tabs;

  const focusPane = () => {
    if (!isActive) session.workspace.setState((s) => activate(s, pane.id));
  };

  const onTabDrop = (event: DragEvent, index: number) => {
    const tabId = event.dataTransfer.getData('application/x-cobblestone-tab');
    const path = event.dataTransfer.getData('application/x-cobblestone-path');
    setDragOver(null);
    if (tabId && pane.tabs.some((tab) => tab.id === tabId)) {
      event.preventDefault();
      session.workspace.setState((s) => moveTab(s, pane.id, tabId, index));
    } else if (path) {
      event.preventDefault();
      session.workspace.setState((s) => activate(s, pane.id));
      session.openPath(path, 'tab');
    }
  };

  return (
    <section className={`pane${isActive ? ' is-active' : ''}`} onPointerDownCapture={focusPane} onFocusCapture={focusPane}>
      <div
        className="tabs"
        role="tablist"
        hidden={!showTabs}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onTabDrop(e, pane.tabs.length)}
      >
        {pane.tabs.map((tab, index) => (
          <TabButton
            key={tab.id}
            tab={tab}
            pane={pane}
            active={tab.id === pane.activeTab}
            dropBefore={dragOver === index}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(index);
            }}
            onDrop={(e) => {
              e.stopPropagation();
              onTabDrop(e, index);
            }}
          />
        ))}
        <button
          className="icon-button tab-new"
          aria-label={t('rail.newNote')}
          title={t('rail.newNote')}
          onClick={() => {
            session.workspace.setState((s) => open(activate(s, pane.id), { type: 'empty' }, 'tab'));
          }}
        >
          <Plus size={15} strokeWidth={1.75} />
        </button>
      </div>
      <div className="pane-body">
        {pane.tabs.map((tab) => (
          <div key={tab.id} className="tab-content" hidden={tab.id !== pane.activeTab} role="tabpanel">
            <TabView tab={tab} paneId={pane.id} visible={tab.id === pane.activeTab} />
          </div>
        ))}
      </div>
    </section>
  );
}

function TabButton({
  tab,
  pane,
  active,
  dropBefore,
  onDragOver,
  onDrop,
}: {
  tab: Tab;
  pane: Pane;
  active: boolean;
  dropBefore: boolean;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  const session = useSession();
  const title = viewTitle(tab.view);
  const close = () => session.workspace.setState((s) => closeTab(s, pane.id, tab.id));
  return (
    <div
      className={`tab${active ? ' is-active' : ''}${tab.pinned ? ' is-pinned' : ''}${dropBefore ? ' is-drop-before' : ''}`}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      title={title}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-cobblestone-tab', tab.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => session.workspace.setState((s) => activate(s, pane.id, tab.id))}
      onAuxClick={(e) => e.button === 1 && close()}
      onContextMenu={(e) => {
        e.preventDefault();
        session.ui.setState({
          menu: {
            x: e.clientX,
            y: e.clientY,
            items: [
              {
                label: tab.pinned ? t('note.unpin') : t('note.pin'),
                run: () => session.workspace.setState((s) => togglePin(s, pane.id, tab.id)),
              },
              { label: t('note.close'), run: close },
            ],
          },
        });
      }}
    >
      <TabIcon view={tab.view} />
      <span className="tab-title">{title}</span>
      {tab.pinned ? (
        <Pin size={12} strokeWidth={2} className="tab-pin" aria-label={t('note.pin')} />
      ) : (
        <button
          className="tab-close"
          aria-label={t('note.close')}
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
        >
          <X size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function TabView({ tab, paneId, visible }: { tab: Tab; paneId: string; visible: boolean }) {
  const view = tab.view;
  switch (view.type) {
    case 'note':
      return <NoteView tab={tab} paneId={paneId} view={view} visible={visible} />;
    case 'file':
      return <FileView path={view.path} />;
    case 'canvas':
      return <CanvasView key={view.path} path={view.path} visible={visible} />;
    case 'graph':
      return <GraphView focus={view.focus} visible={visible} />;
    case 'settings':
      return <SettingsView />;
    case 'empty':
      return <EmptyView />;
  }
}
