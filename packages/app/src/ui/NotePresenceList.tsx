import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { useSession } from './hooks';

/** The other devices on this note right now, each in its ink: writing or reading. */
export function NotePresenceList({ path }: { path: string }) {
  const session = useSession();
  const [, setTick] = useState(0);
  useEffect(() => session.sync.onPresence(() => setTick((n) => n + 1)), [session]);
  const devices = session.sync.devicesOn(path);
  if (devices.length === 0) return null;
  return (
    <ul className="note-presence" aria-label={t('sync.presence')}>
      {devices.map((d) => (
        <li
          key={d.device}
          className={`note-presence-device is-ink-${d.ink}`}
          data-reading={d.reading}
          title={t(d.reading ? 'sync.presence.reading' : 'sync.presence.writing', { name: d.name })}
          aria-label={t(d.reading ? 'sync.presence.reading' : 'sync.presence.writing', { name: d.name })}
        >
          <span className="note-presence-dot" aria-hidden />
          <span className="note-presence-name">{d.name}</span>
        </li>
      ))}
    </ul>
  );
}
