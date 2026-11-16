import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark as BookmarkIcon, BookmarkCheck, Check, ChevronLeft, MoreHorizontal, PenLine, Search } from 'lucide-react';
import { dirname, stem } from '@cobblestone/core';
import { isBookmarked } from '../bookmarks';
import { t, type MessageKey } from '../i18n';
import { setMode, type Tab, type ViewState } from '../workspace/workspace';
import { ContextMenu } from './ContextMenu';
import { Finder } from './Finder';
import { HoverPreview } from './HoverPreview';
import { useSession, useStore } from './hooks';
import { TabView } from './LayoutView';
import { MobileHome, type HomeTab } from './MobileHome';
import { MobileSearch } from './MobileSearch';
import { isStandalone, useVisualViewport } from './mobile-hooks';
import { homeWorkspace, mobileBack, previousView, screenKey, shownTab } from './mobile-nav';
import { moveToFolder } from './mobile-menus';
import { PairingDialog } from './PairingDialog';
import { ShareSheet } from './ShareSheet';
import { Toasts } from './Toasts';
import { UpdateReady } from './UpdateReady';
import { useWorkbenchBasics } from './workbench-basics';

/**
 * The workbench for phone-width screens (≤ 767 px): one screen at a time, stacked. Home lists the
 * notes; a note pushes over it, a link pushes the next note; back (button, edge swipe, the browser's
 * own back) pops one screen.
 */
export function MobileWorkbench({ onSwitchVault }: { onSwitchVault: () => void }) {
  const session = useSession();
  const style = useWorkbenchBasics(onSwitchVault);
  const keyboard = useVisualViewport();
  const key = useStore(session.workspace, screenKey);
  const [home, setHome] = useState(true);
  const [searching, setSearching] = useState(false);
  const [homeTab, setHomeTab] = useState<HomeTab>('recent');
  const [folder, setFolder] = useState('');
  const [motion, setMotion] = useState<'push' | 'pop'>('push');
  /** Screens pushed onto the browser's history, so its back gesture and button pop them. */
  const depth = useRef(0);
  const popping = useRef(false);
  /** The search screen has its own history entry: a note opened from it takes that entry over. */
  const searchEntry = useRef(false);
  const lastKey = useRef<string | null>(screenKey(session.workspace.getState()));

  useEffect(() => {
    session.phone = true;
    // Start on the home screen, with a fresh stack.
    session.workspace.setState(homeWorkspace());
    return () => {
      session.phone = false;
    };
  }, [session]);

  // A new screen: from a tap, a link, a command, the finder.
  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (!key) {
      popping.current = false;
      return;
    }
    setHome(false);
    setSearching(false);
    if (popping.current) {
      popping.current = false;
      return;
    }
    setMotion('push');
    if (searchEntry.current) {
      searchEntry.current = false;
      window.history.replaceState({ cobblestone: depth.current }, '');
      return;
    }
    depth.current += 1;
    window.history.pushState({ cobblestone: depth.current }, '');
  }, [key]);

  const openSearch = useCallback(() => {
    if (searchEntry.current) return;
    searchEntry.current = true;
    depth.current += 1;
    window.history.pushState({ cobblestone: depth.current }, '');
    setSearching(true);
  }, []);

  const closeSearch = useCallback(() => {
    if (searchEntry.current) window.history.back();
    else setSearching(false);
  }, []);

  const goHome = useCallback(() => {
    popping.current = true;
    setMotion('pop');
    session.workspace.setState(homeWorkspace());
    setHome(true);
  }, [session]);

  const pop = useCallback(() => {
    const next = mobileBack(session.workspace.getState());
    // Nothing below, or only the empty tab the stack started from.
    if (!next || !shownTab(next)) return goHome();
    popping.current = true;
    setMotion('pop');
    session.workspace.setState(next, true);
  }, [session, goHome]);

  useEffect(() => {
    const onPop = () => {
      depth.current = Math.max(0, depth.current - 1);
      if (searchEntry.current) {
        searchEntry.current = false;
        setSearching(false);
      } else if (!home) pop();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [pop, home]);

  const back = () => (depth.current > 0 ? window.history.back() : pop());

  // Panels asked for elsewhere (a tag, "reveal in folder", a folder bookmark) open their phone screen.
  const reveal = useStore(session.ui, (s) => s.reveal);
  useEffect(() => {
    if (!reveal) return;
    if (reveal.panel === 'search') openSearch();
    else if (reveal.panel === 'files') {
      const target = session.ui.getState().revealed;
      if (target != null) setFolder(session.vault.getFolder(target) ? target : dirname(target));
      setHomeTab('folders');
      if (!home) goHome();
    }
    // Only a new request counts, not a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal?.seq]);

  const shownTabState = useStore(session.workspace, (s) => shownTab(s)?.tab ?? null);
  const shownPane = useStore(session.workspace, (s) => shownTab(s)?.paneId ?? null);
  const shown = shownTabState && shownPane ? { tab: shownTabState, paneId: shownPane } : null;
  const below = useStore(session.workspace, previousView);

  return (
    <div className={`mobile-workbench${keyboard ? ' has-keyboard' : ''}`} style={style}>
      <MobileHome
        hidden={!home}
        tab={homeTab}
        onTab={setHomeTab}
        folder={folder}
        onFolder={setFolder}
        onSearch={openSearch}
        onSwitchVault={onSwitchVault}
      />
      {!home && shown && (
        <MobileScreen
          key={key ?? ''}
          tab={shown.tab}
          paneId={shown.paneId}
          motion={motion}
          backLabel={below ? viewLabel(below) : t('mobile.home')}
          onBack={back}
          onSearch={openSearch}
          onReveal={(path) => session.revealInTree(path)}
          keyboard={keyboard}
        />
      )}
      {searching && <MobileSearch onClose={closeSearch} />}

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

const VIEW_NAMES: Partial<Record<ViewState['type'], MessageKey>> = { graph: 'graph.title', settings: 'settings.title' };

function viewLabel(view: ViewState): string {
  if ('path' in view) return stem(view.path);
  const key = VIEW_NAMES[view.type];
  return key ? t(key) : t('mobile.home');
}

function MobileScreen({
  tab,
  paneId,
  motion,
  backLabel,
  onBack,
  onSearch,
  onReveal,
  keyboard,
}: {
  tab: Tab;
  paneId: string;
  motion: 'push' | 'pop';
  backLabel: string;
  onBack: () => void;
  onSearch: () => void;
  onReveal: (path: string) => void;
  keyboard: boolean;
}) {
  const session = useSession();
  const view = tab.view;
  const path = view.type === 'note' ? view.path : null;
  const bookmarked = useStore(session.bookmarks, (b) => (path ? isBookmarked(b, path) : false));
  const defaultMode = useStore(session.settings, (s) => s.defaultMode);
  const mode = view.type === 'note' ? (view.mode ?? defaultMode) : null;
  const setTabMode = (next: 'live' | 'source' | 'read') => session.workspace.setState((s) => setMode(s, paneId, tab.id, next));

  // Edge swipe back where no browser does it (installed on the home screen).
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipe.current = touch && touch.clientX < 24 && isStandalone() ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipe.current;
    const touch = e.changedTouches[0];
    swipe.current = null;
    if (start && touch && touch.clientX - start.x > 70 && Math.abs(touch.clientY - start.y) < 60) onBack();
  };

  const more = (event: React.MouseEvent) => {
    if (!path) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    session.ui.setState({
      menu: {
        x: rect.right,
        y: rect.bottom,
        items: [
          { label: t('note.share'), run: () => session.ui.setState({ share: path }) },
          { label: t('cmd.renameNote'), run: () => session.ui.setState({ focusTitle: path }) },
          { label: t('mobile.moveTo'), run: () => moveToFolder(session, path) },
          { label: t('cmd.copyLink'), run: () => void session.commands.run('note:copy-link') },
          { label: t('cmd.localGraph'), run: () => session.openView({ type: 'graph', focus: path }) },
          { label: t('mobile.revealFolder'), run: () => onReveal(path) },
          {
            label: mode === 'source' ? t('mobile.hideSource') : t('cmd.sourceMode'),
            run: () => setTabMode(mode === 'source' ? 'live' : 'source'),
          },
          { label: t('cmd.deleteNote'), run: () => void session.delete(path), danger: true, separatorBefore: true },
        ],
      },
    });
  };

  return (
    <section className={`mobile-screen is-${motion}`} data-view={view.type} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="mobile-topbar">
        <button className="mobile-back" onClick={onBack}>
          <ChevronLeft size={24} strokeWidth={2.2} aria-hidden />
          <span>{backLabel}</span>
        </button>
        {path && (
          <div className="mobile-topbar-actions">
            <button
              className={`mobile-icon${bookmarked ? ' is-on' : ''}`}
              onClick={() => session.toggleBookmark(path)}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? t('mobile.unpin') : t('mobile.pin')}
            >
              {bookmarked ? <BookmarkCheck size={21} strokeWidth={1.9} /> : <BookmarkIcon size={21} strokeWidth={1.9} />}
            </button>
            <button className="mobile-icon" onClick={more} aria-label={t('note.more')}>
              <MoreHorizontal size={22} strokeWidth={1.9} />
            </button>
          </div>
        )}
      </header>
      <div className="mobile-view">
        <TabView tab={tab} paneId={paneId} visible />
      </div>
      {mode && !keyboard && (
        <div className="mobile-tools" role="toolbar" aria-label={t('mobile.tools')}>
          {mode === 'read' ? (
            <button className="is-primary" onClick={() => setTabMode('live')}>
              <PenLine size={17} strokeWidth={2} aria-hidden />
              {t('mobile.edit')}
            </button>
          ) : (
            <button className="is-primary" onClick={() => setTabMode('read')}>
              <Check size={17} strokeWidth={2.2} aria-hidden />
              {t('mobile.done')}
            </button>
          )}
          <button onClick={onSearch} aria-label={t('rail.find')}>
            <Search size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
