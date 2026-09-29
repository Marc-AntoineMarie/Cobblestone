import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { t } from '../i18n';
import { useSession, useVaultRevision } from './hooks';

interface TagNode {
  name: string;
  full: string;
  count: number;
  children: TagNode[];
}

/** Tags of the vault as a nested list with note counts. */
export function TagList({ onPick }: { onPick: (tag: string) => void }) {
  const session = useSession();
  const revision = useVaultRevision();
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const roots = useMemo(() => {
    void revision;
    const byName = new Map<string, TagNode>();
    const roots: TagNode[] = [];
    const tags = [...session.vault.cache.getTags()].sort(([a], [b]) => a.localeCompare(b));
    for (const [tag, count] of tags) {
      const full = tag.slice(1);
      const key = full.toLowerCase();
      const node: TagNode = { name: full.slice(full.lastIndexOf('/') + 1), full, count, children: [] };
      byName.set(key, node);
      const parentKey = key.includes('/') ? key.slice(0, key.lastIndexOf('/')) : null;
      const parent = parentKey ? byName.get(parentKey) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }, [session, revision]);

  if (roots.length === 0) return null;

  const render = (node: TagNode, depth: number): React.ReactNode => (
    <li key={node.full}>
      <div className="tag-row" style={{ paddingInlineStart: 10 + depth * 16 }}>
        <span className="tree-chevron">
          {node.children.length > 0 && (
            <button
              className="chevron-button"
              aria-label={node.full}
              aria-expanded={!!expanded[node.full]}
              onClick={() => setExpanded((e) => ({ ...e, [node.full]: !e[node.full] }))}
            >
              <ChevronRight size={14} strokeWidth={2} className={expanded[node.full] ? 'is-open' : undefined} />
            </button>
          )}
        </span>
        <button className="tag-name" onClick={() => onPick('#' + node.full)}>
          <span className="tag-hash">#</span>
          {node.name}
        </button>
        <span className="tree-count">{node.count}</span>
      </div>
      {node.children.length > 0 && expanded[node.full] && <ul>{node.children.map((c) => render(c, depth + 1))}</ul>}
    </li>
  );

  return (
    <section className={`rail-section rail-tags${open ? '' : ' is-collapsed'}`} aria-labelledby="rail-tags-label">
      <header className="rail-section-head">
        <button className="label section-toggle" id="rail-tags-label" aria-expanded={open} onClick={() => setOpen(!open)}>
          <ChevronRight size={12} strokeWidth={2.25} className={open ? 'is-open' : undefined} aria-hidden />
          {t('rail.tags')}
        </button>
      </header>
      {open && <ul className="tag-list">{roots.map((node) => render(node, 0))}</ul>}
    </section>
  );
}
