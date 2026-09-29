import { useMemo } from 'react';
import { PanelRightClose } from 'lucide-react';
import { stem } from '@cobblestone/core';
import { t } from '../i18n';
import { useNoteRevision, useSession, useStore } from './hooks';

/**
 * Notes in the margin of the sheet: who links here, the outline, links out
 * and properties. Follows the active note.
 */
export function Marginalia({ drawer }: { drawer: boolean }) {
  const session = useSession();
  const path = useStore(session.workspace, () => (session.activeView?.type === 'note' ? session.activePath : null));
  const close = () => session.ui.setState({ marginOpen: false });

  return (
    <>
      {drawer && <div className="scrim" onClick={close} aria-hidden />}
      <aside className={`margin${drawer ? ' is-drawer' : ''}`} aria-label={t('margin.backlinks')}>
        <header className="margin-head">
          <button className="icon-button" onClick={close} aria-label={t('margin.hide')} title={t('margin.hide')}>
            <PanelRightClose size={16} strokeWidth={1.75} />
          </button>
        </header>
        {path ? <MarginNotes path={path} /> : <p className="margin-empty">{t('empty.title')}</p>}
      </aside>
    </>
  );
}

function MarginNotes({ path }: { path: string }) {
  const session = useSession();
  const revision = useNoteRevision(path);
  const cache = session.vault.cache;

  const data = useMemo(() => {
    void revision;
    const meta = cache.getMetadata(path);
    const backlinks = cache.getBacklinks(path).map((backlink) => {
      const text = session.vault.cachedRead(backlink.source) ?? '';
      const lines = text.split('\n');
      const contexts = backlink.links.slice(0, 3).map((link) => {
        const line = lines[link.line] ?? '';
        const start = link.from - text.split('\n').slice(0, link.line).join('\n').length - (link.line > 0 ? 1 : 0);
        return { line: link.line, text: line, start, end: start + link.raw.length };
      });
      return { ...backlink, contexts };
    });
    const resolved = [...cache.getResolvedLinks(path).keys()].filter((p) => p !== path);
    const unresolved = [...cache.getUnresolvedLinks(path).keys()];
    const properties = Object.entries(meta?.frontmatter?.data ?? {}).filter(([key]) => !['tags', 'tag', 'aliases', 'alias'].includes(key));
    return { meta, backlinks, resolved, unresolved, properties };
  }, [session, cache, path, revision]);

  return (
    <div className="margin-notes">
      <section aria-labelledby="m-backlinks">
        <h2 className="label" id="m-backlinks">
          {t('margin.backlinks')} <span className="count">{data.backlinks.length}</span>
        </h2>
        {data.backlinks.length === 0 ? (
          <p className="margin-empty">{t('margin.noBacklinks')}</p>
        ) : (
          <ul className="backlinks">
            {data.backlinks.map((b) => (
              <li key={b.source}>
                <button className="margin-link" onClick={(e) => session.openPath(b.source, e.metaKey || e.ctrlKey ? 'tab' : 'current')}>
                  {stem(b.source)}
                </button>
                {b.contexts.map((c, i) => (
                  <button
                    key={i}
                    className="backlink-context"
                    onClick={() => {
                      session.openPath(b.source);
                      setTimeout(() => session.events.emit('jump', b.source, c.line), 60);
                    }}
                  >
                    {contextSegments(c.text, c.start).map((segment, k) =>
                      segment.hit ? <mark key={k}>{segment.text}</mark> : <span key={k}>{segment.text}</span>,
                    )}
                  </button>
                ))}
                {b.propertyKeys.length > 0 && <span className="backlink-property">{b.propertyKeys.join(', ')}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="m-outline">
        <h2 className="label" id="m-outline">
          {t('margin.outline')}
        </h2>
        {!data.meta?.headings.length ? (
          <p className="margin-empty">{t('margin.noOutline')}</p>
        ) : (
          <ol className="outline">
            {data.meta.headings.map((h, i) => (
              <li key={i} style={{ paddingInlineStart: (h.level - 1) * 12 }}>
                <button className={`outline-item level-${h.level}`} onClick={() => session.events.emit('jump', path, h.line)}>
                  {h.text}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="m-out">
        <h2 className="label" id="m-out">
          {t('margin.outgoing')} <span className="count">{data.resolved.length + data.unresolved.length}</span>
        </h2>
        {data.resolved.length + data.unresolved.length === 0 ? (
          <p className="margin-empty">{t('margin.noOutgoing')}</p>
        ) : (
          <ul className="outgoing">
            {data.resolved.map((p) => (
              <li key={p}>
                <button className="margin-link" onClick={(e) => session.openPath(p, e.metaKey || e.ctrlKey ? 'tab' : 'current')}>
                  {stem(p)}
                </button>
              </li>
            ))}
            {data.unresolved.map((l) => (
              <li key={l}>
                <button className="margin-link is-unresolved" onClick={() => void session.openLink(l, path)}>
                  {l}
                </button>
                <span className="margin-hint">{t('margin.unresolved')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(data.properties.length > 0 || (data.meta?.allTags.length ?? 0) > 0 || (data.meta?.aliases.length ?? 0) > 0) && (
        <section aria-labelledby="m-props">
          <h2 className="label" id="m-props">
            {t('margin.properties')}
          </h2>
          <dl className="properties">
            {data.meta?.aliases.length ? (
              <div>
                <dt>aliases</dt>
                <dd>{data.meta.aliases.join(', ')}</dd>
              </div>
            ) : null}
            {data.properties.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{formatValue(value)}</dd>
              </div>
            ))}
            {data.meta?.allTags.length ? (
              <div>
                <dt>{t('margin.tags')}</dt>
                <dd className="tag-chips">
                  {data.meta.allTags.map((tag) => (
                    <button key={tag} className="tag-chip" onClick={() => session.findTag(tag)}>
                      {tag}
                    </button>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).replace(/^\[\[(.*)\]\]$/, '$1');
}

/**
 * A backlink's line as readable text: wikilinks and markdown links show their
 * label, list and heading markers are dropped, and the link at `hitAt` is marked.
 */
export function contextSegments(line: string, hitAt: number, radius = 70): { text: string; hit: boolean }[] {
  const segments: { text: string; hit: boolean; from: number }[] = [];
  const pattern = /!?\[\[([^\]|]*)(?:\|([^\]]*))?\]\]|!?\[([^\]]*)\]\([^)]*\)/g;
  let last = 0;
  let hitIndex = -1;
  for (const m of line.matchAll(pattern)) {
    if (m.index > last) segments.push({ text: line.slice(last, m.index), hit: false, from: last });
    const label = m[2] ?? m[1]?.split('#')[0] ?? m[3] ?? m[0];
    const hit = m.index <= hitAt && hitAt < m.index + m[0].length;
    if (hit) hitIndex = segments.length;
    segments.push({ text: label || m[0], hit, from: m.index });
    last = m.index + m[0].length;
  }
  if (last < line.length) segments.push({ text: line.slice(last), hit: false, from: last });
  if (segments[0]) segments[0].text = segments[0].text.replace(/^\s*(?:[-*+]\s+(?:\[.\]\s+)?|\d+[.)]\s+|#{1,6}\s+|>\s*)/, '');

  // Keep a window of text around the hit.
  if (hitIndex !== -1) {
    const before = segments.slice(0, hitIndex).map((s) => s.text).join('');
    const after = segments.slice(hitIndex + 1).map((s) => s.text).join('');
    return [
      { text: before.length > radius ? '…' + before.slice(-radius).replace(/^\S*\s/, '') : before, hit: false },
      { text: segments[hitIndex]!.text, hit: true },
      { text: after.length > radius ? after.slice(0, radius).replace(/\s\S*$/, '') + '…' : after, hit: false },
    ];
  }
  return segments.map(({ text, hit }) => ({ text, hit }));
}
