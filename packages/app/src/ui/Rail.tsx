import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronsUpDown, FilePlus2, FolderPlus, Network, PanelLeftClose, Search, Settings, X } from 'lucide-react';
import { searchDocuments, stem } from '@cobblestone/core';
import { t } from '../i18n';
import { FileTree } from './FileTree';
import { fuzzyMatch, highlightSegments } from './fuzzy';
import { useSession, useStore, useVaultRevision } from './hooks';
import { Mark } from './Mark';
import { PressStatus } from './PressStatus';
import { TagList } from './TagList';

export function Rail({ onSwitchVault, drawer }: { onSwitchVault: () => void; drawer: boolean }) {
  const session = useSession();
  const open = useStore(session.ui, (s) => s.railOpen);
  const query = useStore(session.ui, (s) => s.railQuery);
  const setQuery = (railQuery: string) => session.ui.setState({ railQuery });
  const findRef = useRef<HTMLInputElement>(null);

  if (!open) {
    return null;
  }

  const vaultMenu = (event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    session.ui.setState({
      menu: {
        x: rect.left,
        y: rect.bottom + 4,
        items: [
          { label: t('rail.settings'), run: () => session.openView({ type: 'settings' }, 'tab') },
          { label: t('rail.switchVault'), run: onSwitchVault },
        ],
      },
    });
  };

  return (
    <>
      {drawer && <div className="scrim" onClick={() => session.ui.setState({ railOpen: false })} aria-hidden />}
      <aside className={`rail${drawer ? ' is-drawer' : ''}`} aria-label={session.vault.name}>
        <header className="rail-head">
          <button className="vault-switch" onClick={vaultMenu} aria-haspopup="menu">
            <Mark size={22} />
            <span className="vault-name">{session.vault.name}</span>
            <ChevronsUpDown size={14} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            className="icon-button"
            onClick={() => session.ui.setState({ railOpen: false })}
            title={t('rail.collapse')}
            aria-label={t('rail.collapse')}
          >
            <PanelLeftClose size={16} strokeWidth={1.75} />
          </button>
        </header>

        <div className="rail-find">
          <Search size={15} strokeWidth={1.75} aria-hidden className="rail-find-icon" />
          <input
            ref={findRef}
            type="search"
            value={query}
            placeholder={t('rail.findPlaceholder')}
            aria-label={t('rail.find')}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('');
                e.currentTarget.blur();
              }
            }}
          />
          {query && (
            <button className="icon-button rail-find-clear" onClick={() => setQuery('')} aria-label={t('launcher.cancel')}>
              <X size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {query.trim() ? (
          <FindResults query={query} onDone={() => setQuery('')} inputRef={findRef} />
        ) : (
          <>
            <nav className="rail-stations" aria-label="Cobblestone">
              <button className="station" onClick={() => void session.openDailyNote()}>
                <CalendarDays size={16} strokeWidth={1.75} aria-hidden />
                {t('rail.today')}
              </button>
              <button className="station" onClick={() => session.openView({ type: 'graph' }, 'tab')}>
                <Network size={16} strokeWidth={1.75} aria-hidden />
                {t('rail.graph')}
              </button>
            </nav>

            <section className="rail-section rail-notes" aria-labelledby="rail-notes-label">
              <header className="rail-section-head">
                <h2 id="rail-notes-label" className="label">
                  {t('rail.notes')}
                </h2>
                <div className="rail-section-actions">
                  <button
                    className="icon-button"
                    onClick={() => void session.createNote()}
                    title={t('rail.newNote')}
                    aria-label={t('rail.newNote')}
                  >
                    <FilePlus2 size={15} strokeWidth={1.75} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => void session.createFolder('')}
                    title={t('rail.newFolder')}
                    aria-label={t('rail.newFolder')}
                  >
                    <FolderPlus size={15} strokeWidth={1.75} />
                  </button>
                </div>
              </header>
              <FileTree />
            </section>

            <TagList onPick={(tag) => session.findTag(tag)} />
          </>
        )}

        <footer className="rail-foot">
          <PressStatus />
          <button
            className="icon-button"
            onClick={() => session.openView({ type: 'settings' }, 'tab')}
            title={t('rail.settings')}
            aria-label={t('rail.settings')}
          >
            <Settings size={16} strokeWidth={1.75} />
          </button>
        </footer>
      </aside>
    </>
  );
}

interface Hit {
  key: string;
  kind: 'name' | 'text' | 'create';
  path?: string;
  label: string;
  indices?: number[];
  folder?: string;
  snippet?: { before: string; match: string; after: string; line: number };
}

/** One field that finds notes by name, searches their text, or creates one. */
function FindResults({ query, onDone, inputRef }: { query: string; onDone: () => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const session = useSession();
  const revision = useVaultRevision();
  const deferred = useDeferredValue(query);
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const hits = useMemo<Hit[]>(() => {
    void revision;
    const q = deferred.trim();
    const operator = /^[\w-]+:|^\[|^\/|^"|^-/.test(q) || /\s(OR|-)/.test(q);
    const out: Hit[] = [];

    if (!operator) {
      const names: Hit[] = [];
      for (const file of session.vault.getFiles()) {
        const label = file.extension === 'md' ? file.basename : file.name;
        const match = fuzzyMatch(q, label);
        if (match) names.push({ key: 'n:' + file.path, kind: 'name', path: file.path, label, indices: match.indices, folder: file.parent, ...{ score: match.score } } as Hit);
      }
      names.sort((a, b) => ((b as Hit & { score: number }).score - (a as Hit & { score: number }).score));
      out.push(...names.slice(0, 8));
      const exact = names.some((h) => h.label.toLowerCase() === q.toLowerCase());
      if (!exact && !/[\\/:*?"<>|#^[\]]/.test(q)) out.push({ key: 'create', kind: 'create', label: q });
    }

    try {
      const documents = session.vault.getMarkdownFiles().map((file) => ({
        path: file.path,
        content: session.vault.cachedRead(file.path) ?? '',
        metadata: session.vault.cache.getMetadata(file.path),
      }));
      for (const result of searchDocuments(documents, q, { limit: 40, maxMatchesPerFile: 3 })) {
        const text = session.vault.cachedRead(result.path) ?? '';
        const first = result.matches[0];
        let snippet: Hit['snippet'];
        if (first) {
          const lineStart = text.lastIndexOf('\n', first.from - 1) + 1;
          const lineEnd = text.indexOf('\n', first.to);
          const lineText = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
          const start = first.from - lineStart;
          const end = first.to - lineStart;
          const before = lineText.slice(Math.max(0, start - 36), start);
          snippet = {
            before: (start > 36 ? '…' : '') + before.trimStart(),
            match: lineText.slice(start, end),
            after: lineText.slice(end, end + 80),
            line: first.line,
          };
        }
        if (!snippet && !operator) continue;
        out.push({ key: 't:' + result.path, kind: 'text', path: result.path, label: stem(result.path), snippet, folder: result.path.includes('/') ? result.path.slice(0, result.path.lastIndexOf('/')) : '' });
      }
    } catch {
      // Unfinished query syntax (e.g. an open regex): show name matches only.
    }
    return out;
  }, [session, deferred, revision]);

  useEffect(() => setSelected(0), [deferred]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const activate = (hit: Hit | undefined, newTab = false) => {
    if (!hit) return;
    if (hit.kind === 'create') void session.createNote(session.newNoteFolder(), hit.label);
    else if (hit.path) {
      session.openPath(hit.path, newTab ? 'tab' : 'current');
    }
    onDone();
  };

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowDown') setSelected((i) => Math.min(hits.length - 1, i + 1));
      else if (event.key === 'ArrowUp') setSelected((i) => Math.max(0, i - 1));
      else if (event.key === 'Enter') activate(hits[selected], event.metaKey || event.ctrlKey);
      else return;
      event.preventDefault();
    };
    input.addEventListener('keydown', onKey);
    return () => input.removeEventListener('keydown', onKey);
  });

  const names = hits.filter((h) => h.kind !== 'text');
  const texts = hits.filter((h) => h.kind === 'text');
  const indexOf = (hit: Hit) => hits.indexOf(hit);

  const row = (hit: Hit) => (
    <div
      key={hit.key}
      role="option"
      aria-selected={indexOf(hit) === selected}
      className={`find-hit is-${hit.kind}`}
      onMouseEnter={() => setSelected(indexOf(hit))}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => activate(hit, e.metaKey || e.ctrlKey)}
    >
      {hit.kind === 'create' ? (
        <span className="find-create">
          <FilePlus2 size={14} strokeWidth={1.75} aria-hidden /> {t('rail.createNamed', { name: hit.label })}
        </span>
      ) : (
        <>
          <span className="find-name">
            {hit.kind === 'name'
              ? highlightSegments(hit.label, hit.indices ?? []).map((s, i) => (s.hit ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))
              : hit.label}
          </span>
          {hit.folder && <span className="find-folder">{hit.folder}</span>}
          {hit.snippet && (
            <span className="find-snippet">
              {hit.snippet.before}
              <mark>{hit.snippet.match}</mark>
              {hit.snippet.after}
            </span>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="find-results" ref={listRef} role="listbox" aria-label={t('rail.find')} onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}>
      {names.length > 0 && (
        <section>
          <h2 className="label find-group">{t('rail.inNames')}</h2>
          {names.map(row)}
        </section>
      )}
      {texts.length > 0 && (
        <section>
          <h2 className="label find-group">
            {t('rail.inText')} <span className="find-count">{texts.length}</span>
          </h2>
          {texts.map(row)}
        </section>
      )}
      {hits.length === 0 && <p className="find-empty">{t('rail.noResults', { query })}</p>}
    </div>
  );
}
