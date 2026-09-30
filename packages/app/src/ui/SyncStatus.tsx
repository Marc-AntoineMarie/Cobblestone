import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Monitor, Pause, Play, RefreshCw, Smartphone, TriangleAlert, WifiOff } from 'lucide-react';
import type { DeviceKind } from '@cobblestone/sync';
import { getLanguage, t } from '../i18n';
import type { SyncState } from '../sync';
import { useSession, useStore, useVaultRevision } from './hooks';

/** Copies made when two devices created the same name: "Plan (conflit 3fa2).md". */
export const CONFLICT_COPY = / \(conflit [0-9a-f]{4}\)(\.[^/]*)?$/;

/** Conflict copies in the vault, kept up to date. */
export function useConflictCopies(): string[] {
  const session = useSession();
  const revision = useVaultRevision();
  return useMemo(() => {
    void revision;
    return session.vault
      .getFiles()
      .map((f) => f.path)
      .filter((path) => CONFLICT_COPY.test(path))
      .sort();
  }, [session, revision]);
}

export type SyncSummary = { kind: 'paused' | 'removed' | 'receiving' | 'online' | 'offline'; online: string[] };

/** Where the sync stands, the same in the status bar and the settings. */
export function syncSummary(state: SyncState): SyncSummary {
  const online = state.devices.filter((d) => d.online && !d.removed).map((d) => d.name);
  if (state.paused) return { kind: 'paused', online };
  if (state.removed) return { kind: 'removed', online };
  if (!online.length) return { kind: 'offline', online };
  if (state.receiving > 0) return { kind: 'receiving', online };
  return { kind: 'online', online };
}

/** "12 seconds ago", "3 minutes ago"… in the interface's language. */
export function ago(time: number | null, now = Date.now()): string {
  if (time === null) return t('sync.never');
  const format = new Intl.RelativeTimeFormat(getLanguage(), { numeric: 'auto' });
  const seconds = Math.round((time - now) / 1000);
  if (seconds > -45) return format.format(Math.min(0, seconds), 'second');
  const minutes = Math.round(seconds / 60);
  if (minutes > -60) return format.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours > -24) return format.format(hours, 'hour');
  return format.format(Math.round(hours / 24), 'day');
}

/** A value that changes every few seconds, so that "12 seconds ago" stays true. */
export function useNow(every = 5000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}

export function DeviceIcon({ kind, size = 18 }: { kind: DeviceKind; size?: number }) {
  const Icon = kind === 'web' ? Globe : kind === 'phone' ? Smartphone : Monitor;
  return <Icon size={size} strokeWidth={1.75} aria-hidden />;
}

/** The sync of the vault, in the status bar; a click shows the devices. */
export function SyncStatus() {
  const session = useSession();
  const state = useStore(session.sync.state, (s) => s);
  const conflicts = useConflictCopies();
  const [open, setOpen] = useState(false);
  if (!state.enabled) return null;
  const summary = syncSummary(state);
  const label = {
    paused: t('sync.status.paused'),
    removed: t('sync.status.removed'),
    offline: t('sync.status.offline'),
    receiving: t('sync.status.receiving', { count: state.receiving }),
    online: t('sync.status.upToDate', { count: summary.online.length + 1 }),
  }[summary.kind];
  return (
    <div className="status-sync">
      <button
        className={`status-button sync-pill is-${summary.kind}${conflicts.length ? ' has-conflicts' : ''}${open ? ' is-on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {conflicts.length ? (
          <>
            <TriangleAlert size={13} strokeWidth={2} aria-hidden />
            {t('sync.status.conflicts', { count: conflicts.length })}
          </>
        ) : (
          <>
            <SyncGlyph kind={summary.kind} />
            {label}
          </>
        )}
      </button>
      {open && <SyncPopover state={state} summary={summary} onClose={() => setOpen(false)} />}
    </div>
  );
}

function SyncGlyph({ kind }: { kind: SyncSummary['kind'] }) {
  if (kind === 'paused') return <Pause size={12} strokeWidth={2.25} aria-hidden />;
  if (kind === 'offline' || kind === 'removed') return <WifiOff size={13} strokeWidth={2} aria-hidden />;
  if (kind === 'receiving') return <RefreshCw size={12} strokeWidth={2.25} aria-hidden className="sync-turning" />;
  return <span className="sync-dot is-on" aria-hidden />;
}

function SyncPopover({ state, summary, onClose }: { state: SyncState; summary: SyncSummary; onClose: () => void }) {
  const session = useSession();
  const box = useRef<HTMLElement>(null);
  const now = useNow();
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!box.current?.contains(target) && !target.closest?.('.status-sync')) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);
  const others = state.devices.filter((d) => !d.self && !d.removed);
  return (
    <section className="sync-popover" role="dialog" aria-label={t('settings.sync')} ref={box}>
      <header>
        <h2>{t('settings.sync')}</h2>
        <SyncStateText summary={summary} />
      </header>
      <p className="sync-popover-note">{describeState(state, summary, now)}</p>
      {others.length > 0 && (
        <ul className="sync-popover-devices">
          {others.map((d) => (
            <li key={d.id}>
              <DeviceIcon kind={d.kind} size={16} />
              <span>
                <strong>{d.name}</strong>
                <span>{d.online ? t('sync.device.online') : t('sync.device.offline')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="sync-popover-actions">
        <button className="button" onClick={() => (state.paused ? session.sync.resume() : session.sync.pause())}>
          {state.paused ? <Play size={13} strokeWidth={2} aria-hidden /> : <Pause size={13} strokeWidth={2} aria-hidden />}
          {state.paused ? t('sync.resume') : t('sync.pause')}
        </button>
        <button
          className="link-button"
          onClick={() => {
            onClose();
            session.openSettings('sync');
          }}
        >
          {t('sync.status.settings')}
        </button>
      </div>
    </section>
  );
}

function SyncStateText({ summary }: { summary: SyncSummary }) {
  const title = {
    paused: t('sync.state.paused'),
    removed: t('sync.state.removed'),
    offline: t('sync.state.offline'),
    receiving: t('sync.state.receiving'),
    online: t('sync.state.upToDate'),
  }[summary.kind];
  return (
    <span className={`sync-state is-${summary.kind}`}>
      <SyncGlyph kind={summary.kind} />
      {title}
    </span>
  );
}

/** The sentence under the state: why, and what happens next. */
export function describeState(state: SyncState, summary: SyncSummary, now: number): string {
  switch (summary.kind) {
    case 'paused':
      return t('sync.state.paused.text');
    case 'removed':
      return t('sync.state.removed.text');
    case 'offline':
      return t('sync.state.offline.text');
    case 'receiving':
      return t('sync.state.receiving.text', { count: state.receiving });
    default:
      return t('sync.state.online', {
        names: new Intl.ListFormat(getLanguage(), { type: 'conjunction' }).format(summary.online),
        when: ago(state.lastExchange, now),
      });
  }
}

export { SyncStateText };
