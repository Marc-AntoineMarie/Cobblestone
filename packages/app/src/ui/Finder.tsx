import { useEffect, useMemo, useRef, useState } from 'react';
import { FilePlus2, FileText, CornerDownLeft, Terminal } from 'lucide-react';
import { dirname } from '@cobblestone/core';
import { hotkeyLabel } from '../commands';
import { t } from '../i18n';
import { fuzzyMatch, highlightSegments } from './fuzzy';
import { useSession, useStore } from './hooks';

interface Item {
  key: string;
  kind: 'note' | 'alias' | 'create' | 'command';
  label: string;
  detail?: string;
  indices: number[];
  score: number;
  path?: string;
  commandId?: string;
  hotkey?: string;
}

/** One box for everything: notes by name or alias, "> commands", and creating notes. */
export function Finder() {
  const session = useSession();
  const finder = useStore(session.ui, (s) => s.finder);
  if (!finder) return null;
  return <FinderBox initialMode={finder.mode} />;
}

function FinderBox({ initialMode }: { initialMode: 'notes' | 'commands' }) {
  const session = useSession();
  const [query, setQuery] = useState(initialMode === 'commands' ? '> ' : '');
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = () => session.ui.setState({ finder: null });
  const commandMode = query.startsWith('>');
  const text = commandMode ? query.slice(1).trim() : query.trim();

  useEffect(() => {
    input.current?.focus();
    if (initialMode === 'commands') input.current?.setSelectionRange(2, 2);
  }, [initialMode]);

  const items = useMemo<Item[]>(() => {
    if (commandMode) {
      return session.commands
        .list()
        .map((command) => {
          const match = fuzzyMatch(text, command.name);
          if (!match) return null;
          return {
            key: command.id,
            kind: 'command' as const,
            label: command.name,
            detail: command.section,
            indices: match.indices,
            score: match.score,
            commandId: command.id,
            hotkey: command.hotkeys?.[0] ? hotkeyLabel(command.hotkeys[0]) : undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => (text ? b.score - a.score : a.label.localeCompare(b.label)))
        .slice(0, 60);
    }

    if (!text) {
      const recent = session.recent.filter((p) => session.vault.getFile(p)).slice(0, 12);
      const rest = session.vault
        .getMarkdownFiles()
        .filter((f) => !recent.includes(f.path))
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .slice(0, 20 - recent.length)
        .map((f) => f.path);
      return [...recent, ...rest].map((path) => {
        const file = session.vault.getFile(path)!;
        return {
          key: path,
          kind: 'note' as const,
          label: file.extension === 'md' ? file.basename : file.name,
          detail: dirname(path),
          indices: [],
          score: 0,
          path,
        };
      });
    }

    const out: Item[] = [];
    for (const file of session.vault.getFiles()) {
      const label = file.extension === 'md' ? file.basename : file.name;
      const byName = fuzzyMatch(text, label);
      const byPath = byName ? null : fuzzyMatch(text, file.path);
      if (byName || byPath) {
        out.push({
          key: file.path,
          kind: 'note',
          label,
          detail: file.parent,
          indices: byName?.indices ?? [],
          score: (byName?.score ?? byPath!.score - 20) + (session.recent.includes(file.path) ? 6 : 0),
          path: file.path,
        });
      }
      for (const alias of session.vault.cache.getMetadata(file.path)?.aliases ?? []) {
        const match = fuzzyMatch(text, alias);
        if (match)
          out.push({
            key: `${file.path}|${alias}`,
            kind: 'alias',
            label: alias,
            detail: `→ ${label}`,
            indices: match.indices,
            score: match.score - 2,
            path: file.path,
          });
      }
    }
    out.sort((a, b) => b.score - a.score);
    const top = out.slice(0, 40);
    const exact = top.some((item) => item.label.toLowerCase() === text.toLowerCase());
    if (!exact && !/[\\:*?"<>|#^[\]]/.test(text)) {
      top.push({ key: 'create', kind: 'create', label: t('palette.create', { name: text }), indices: [], score: -Infinity });
    }
    return top;
  }, [session, commandMode, text]);

  useEffect(() => setSelected(0), [query]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const run = (item: Item | undefined, newTab: boolean) => {
    if (!item) return;
    close();
    if (item.kind === 'command') void session.commands.run(item.commandId!);
    else if (item.kind === 'create') {
      const parts = text.split('/');
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : session.newNoteFolder();
      void session.createNote(folder, parts[parts.length - 1], '', newTab ? 'tab' : 'current');
    } else if (item.path) session.openPath(item.path, newTab ? 'tab' : 'current');
  };

  return (
    <div className="finder-layer" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div
        className="finder"
        role="dialog"
        aria-modal="true"
        aria-label={commandMode ? t('palette.placeholderCommands') : t('cmd.openFinder')}
      >
        <div className="finder-input">
          {commandMode ? (
            <Terminal size={16} strokeWidth={1.75} aria-hidden />
          ) : (
            <FileText size={16} strokeWidth={1.75} aria-hidden />
          )}
          <input
            ref={input}
            value={query}
            placeholder={commandMode ? t('palette.placeholderCommands') : t('palette.placeholderNotes')}
            role="combobox"
            aria-expanded="true"
            aria-controls="finder-list"
            aria-activedescendant={items[selected] ? `finder-${selected}` : undefined}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              else if (e.key === 'ArrowDown') setSelected((i) => Math.min(items.length - 1, i + 1));
              else if (e.key === 'ArrowUp') setSelected((i) => Math.max(0, i - 1));
              else if (e.key === 'Enter' && e.shiftKey && !commandMode && text)
                run(
                  items.find((i) => i.kind === 'create'),
                  false,
                );
              else if (e.key === 'Enter') run(items[selected], e.metaKey || e.ctrlKey);
              else return;
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
        <div className="finder-list" id="finder-list" role="listbox" ref={list}>
          {items.length === 0 && (
            <p className="finder-empty">{commandMode ? t('palette.noCommands') : t('rail.noResults', { query: text })}</p>
          )}
          {items.map((item, i) => (
            <div
              key={item.key}
              id={`finder-${i}`}
              role="option"
              aria-selected={i === selected}
              className={`finder-item is-${item.kind}`}
              onMouseMove={() => setSelected(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => run(item, e.metaKey || e.ctrlKey)}
            >
              {item.kind === 'create' && <FilePlus2 size={15} strokeWidth={1.75} aria-hidden />}
              <span className="finder-label">
                {highlightSegments(item.label, item.indices).map((s, k) =>
                  s.hit ? <mark key={k}>{s.text}</mark> : <span key={k}>{s.text}</span>,
                )}
              </span>
              {item.detail && <span className="finder-detail">{item.detail}</span>}
              {item.hotkey && <kbd>{item.hotkey}</kbd>}
            </div>
          ))}
        </div>
        <footer className="finder-foot">
          <span>
            <kbd>↑↓</kbd>
          </span>
          <span>
            <kbd>
              <CornerDownLeft size={11} strokeWidth={2} />
            </kbd>{' '}
            {t('palette.hint.open')}
          </span>
          <span>
            <kbd>{hotkeyLabel({ mod: true, key: 'enter' })}</kbd> {t('palette.hint.newTab')}
          </span>
          <span>
            <kbd>Esc</kbd> {t('palette.hint.close')}
          </span>
        </footer>
      </div>
    </div>
  );
}
