import { useMemo, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { stem } from '@cobblestone/core';
import { t } from '../i18n';
import { useSession, useStore } from './hooks';
import { FindResults } from './SearchPanel';

/** Operators a tap adds to the query, for searches a phone keyboard makes tedious to type. */
const FILTERS = ['tag:', 'path:', 'file:', 'task-todo:', 'line:'] as const;

/**
 * Find or create a note, full screen. The field sits at the bottom, just above the keyboard, where
 * the thumb is; results fill the space above it.
 */
export function MobileSearch({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const query = useStore(session.ui, (s) => s.searchQuery);
  const setQuery = (searchQuery: string) => session.ui.setState({ searchQuery });
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = useMemo(() => session.recent.filter((p) => session.vault.getFile(p)).slice(0, 12), [session]);

  const addFilter = (filter: string) => {
    const base = query.trim();
    setQuery(base ? `${base} ${filter}` : filter);
    inputRef.current?.focus();
  };

  return (
    <div className="mobile-search" role="dialog" aria-label={t('rail.find')}>
      <div className="mobile-search-results">
        {query.trim() ? (
          <FindResults
            query={query}
            // The note that opens closes the search (it takes over its place in the history).
            onDone={() => setQuery('')}
            inputRef={inputRef}
          />
        ) : (
          <>
            <h2 className="mobile-label">{t('mobile.search.recent')}</h2>
            <ul className="mobile-list">
              {recent.map((path) => (
                <li key={path}>
                  <button className="mobile-row" onClick={() => session.openPath(path)}>
                    <span className="mobile-row-title">{stem(path)}</span>
                    {path.includes('/') && <span className="mobile-row-detail">{path.slice(0, path.lastIndexOf('/'))}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mobile-hint">{t('mobile.search.hint')}</p>
          </>
        )}
      </div>
      <div className="mobile-search-bar">
        <div className="mobile-filters">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => addFilter(f)}>
              {f}
            </button>
          ))}
          <button
            onClick={() => {
              onClose();
              session.ui.setState({ finder: { mode: 'commands' } });
            }}
          >
            {t('mobile.search.commands')}
          </button>
        </div>
        <div className="mobile-search-row">
          <label className="mobile-search-field">
            <Search size={18} strokeWidth={2.1} aria-hidden />
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="go"
              autoFocus
              value={query}
              placeholder={t('rail.findPlaceholder')}
              aria-label={t('rail.find')}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
            />
            {query && (
              <button className="mobile-icon" onClick={() => setQuery('')} aria-label={t('mobile.search.clear')}>
                <X size={16} strokeWidth={2} />
              </button>
            )}
          </label>
          <button className="mobile-cancel" onClick={onClose}>
            {t('launcher.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
