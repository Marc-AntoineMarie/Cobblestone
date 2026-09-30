import { useState, type MouseEvent } from 'react';
import { ChevronRight, FileText, Folder, FolderClosed, Search } from 'lucide-react';
import { stem } from '@cobblestone/core';
import { removeBookmark, type Bookmark } from '../bookmarks';
import { t } from '../i18n';
import { useSession, useStore } from './hooks';
import { Panel } from './Panel';

function label(bookmark: Bookmark): string {
  if (bookmark.title) return bookmark.title;
  switch (bookmark.type) {
    case 'file':
      return stem(bookmark.path) + (bookmark.subpath ? ` › ${bookmark.subpath.replace(/^#\^?/, '').replace(/#/g, ' › ')}` : '');
    case 'folder':
      return bookmark.path.split('/').pop() ?? bookmark.path;
    case 'search':
      return bookmark.query;
    case 'group':
      return bookmark.title;
  }
}

function Icon({ bookmark }: { bookmark: Bookmark }) {
  const props = { size: 15, strokeWidth: 1.75, className: 'tree-icon', 'aria-hidden': true } as const;
  if (bookmark.type === 'folder') return <Folder {...props} />;
  if (bookmark.type === 'search') return <Search {...props} />;
  if (bookmark.type === 'group') return <FolderClosed {...props} />;
  return <FileText {...props} />;
}

/** Bookmarked notes, folders, headings and searches, in the order the user chose. */
export function BookmarksPanel() {
  const session = useSession();
  const items = useStore(session.bookmarks, (b) => b);
  const activePath = useStore(session.workspace, () => session.activePath);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (items.length === 0) return null;

  const menu = (event: MouseEvent, bookmark: Bookmark) => {
    event.preventDefault();
    session.ui.setState({
      menu: {
        x: event.clientX,
        y: event.clientY,
        items: [{ label: t('bookmark.remove'), run: () => session.bookmarks.setState((b) => removeBookmark(b, bookmark), true) }],
      },
    });
  };

  const render = (bookmark: Bookmark, depth: number): React.ReactNode => {
    const active = bookmark.type === 'file' && bookmark.path === activePath && !bookmark.subpath;
    return (
      <li key={`${bookmark.ctime}-${depth}-${label(bookmark)}`}>
        <button
          className={`tag-row bookmark-row${active ? ' is-active' : ''}`}
          style={{ paddingInlineStart: 10 + depth * 16 }}
          onClick={(e) =>
            bookmark.type === 'group'
              ? setExpanded((x) => ({ ...x, [bookmark.ctime]: !x[bookmark.ctime] }))
              : session.openBookmark(bookmark, e.metaKey || e.ctrlKey ? 'tab' : 'current')
          }
          onContextMenu={(e) => menu(e, bookmark)}
          aria-expanded={bookmark.type === 'group' ? !!expanded[bookmark.ctime] : undefined}
        >
          <span className="tree-chevron">
            {bookmark.type === 'group' && (
              <ChevronRight size={14} strokeWidth={2} className={expanded[bookmark.ctime] ? 'is-open' : undefined} />
            )}
          </span>
          <Icon bookmark={bookmark} />
          <span className="tree-name">{label(bookmark)}</span>
        </button>
        {bookmark.type === 'group' && expanded[bookmark.ctime] && (
          <ul>{bookmark.items.map((item) => render(item, depth + 1))}</ul>
        )}
      </li>
    );
  };

  return (
    <Panel id="bookmarks">
      <ul className="tag-list">{items.map((item) => render(item, 0))}</ul>
    </Panel>
  );
}
