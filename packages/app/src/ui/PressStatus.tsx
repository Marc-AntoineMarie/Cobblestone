import { t, type MessageKey } from '../i18n';

export type SyncState = 'local' | 'synced' | 'syncing' | 'offline' | 'conflict';

const LABELS: Record<SyncState, MessageKey> = {
  local: 'status.local',
  synced: 'status.synced',
  syncing: 'status.syncing',
  offline: 'status.offline',
  conflict: 'status.conflict',
};

/** Each state has a word and a shape; colour is never the only signal. */
function Shape({ state }: { state: SyncState }) {
  switch (state) {
    case 'synced':
      return <circle cx="6" cy="6" r="4.5" className="shape-fill is-green" />;
    case 'syncing':
      return (
        <>
          <circle cx="6" cy="6" r="4" className="shape-ring" />
          <path d="M6 1.5a4.5 4.5 0 0 1 0 9z" className="shape-fill is-ink" />
        </>
      );
    case 'offline':
      return <circle cx="6" cy="6" r="4" className="shape-ring" />;
    case 'conflict':
      return <path d="M6 1.2 11 10.5H1z" className="shape-fill is-red" />;
    case 'local':
      return <rect x="1.8" y="1.8" width="8.4" height="8.4" rx="1.5" className="shape-fill is-ink" />;
  }
}

/** Where the vault stands with its copies on other devices. */
export function PressStatus({ state = 'local' }: { state?: SyncState }) {
  return (
    <div className={`press-status is-${state}`} role="status">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <Shape state={state} />
      </svg>
      <span>{t(LABELS[state])}</span>
    </div>
  );
}
