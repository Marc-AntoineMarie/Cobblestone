import { useEffect, useRef, useState } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { t } from '../i18n';
import type { Platform, UpdateStatus as UpdateStatusValue } from '../platform';
import { UpdateInstalling } from './UpdateInstalling';

/** The background update check, in the status bar; a click shows the detail and lets the user check now. */
export function UpdateStatus({ platform }: { platform: Platform }) {
  const [status, setStatus] = useState<UpdateStatusValue>({ kind: 'idle' });
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    if (!platform.updates) return;
    void platform.updates.status().then(setStatus);
    return platform.updates.onStatus(setStatus);
  }, [platform]);

  if (!platform.updates) return null;
  if (installing) return <UpdateInstalling version={installing} platform={platform} />;

  const label = {
    idle: t('update.status.checking'),
    checking: t('update.status.checking'),
    'up-to-date': t('update.status.upToDate'),
    downloading: t('update.status.downloading'),
    ready: t('update.status.ready'),
    error: t('update.status.error'),
  }[status.kind];

  return (
    <div className="status-update">
      <button
        className={`status-button update-pill is-${status.kind}${open ? ' is-on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <UpdateGlyph kind={status.kind} />
        {label}
      </button>
      {open && (
        <UpdatePopover
          status={status}
          platform={platform}
          onClose={() => setOpen(false)}
          onInstall={(version) => {
            setOpen(false);
            setInstalling(version);
          }}
        />
      )}
    </div>
  );
}

function UpdateGlyph({ kind }: { kind: UpdateStatusValue['kind'] }) {
  if (kind === 'up-to-date') return <span className="sync-dot is-on" aria-hidden />;
  if (kind === 'error') return <TriangleAlert size={13} strokeWidth={2} aria-hidden />;
  if (kind === 'checking' || kind === 'idle' || kind === 'downloading')
    return <RefreshCw size={12} strokeWidth={2.25} aria-hidden className="update-turning" />;
  return <RefreshCw size={12} strokeWidth={2.25} aria-hidden />;
}

function UpdatePopover({
  status,
  platform,
  onClose,
  onInstall,
}: {
  status: UpdateStatusValue;
  platform: Platform;
  onClose: () => void;
  onInstall: (version: string) => void;
}) {
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!box.current?.contains(target) && !target.closest?.('.status-update')) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);
  const note = {
    idle: t('update.status.checking.text'),
    checking: t('update.status.checking.text'),
    'up-to-date': t('update.status.upToDate.text', { version: status.kind === 'up-to-date' ? status.version : '' }),
    downloading: t('update.status.downloading.text', { version: status.kind === 'downloading' ? status.version : '' }),
    ready: t('update.status.ready.text', { version: status.kind === 'ready' ? status.version : '' }),
    error: t('update.status.error.text'),
  }[status.kind];
  return (
    <section className="update-popover" role="dialog" aria-label={t('update.check')} ref={box}>
      <header>
        <h2>{t('update.check')}</h2>
      </header>
      <p className="update-popover-note">{note}</p>
      <div className="update-popover-actions">
        <button
          className="button"
          disabled={status.kind === 'checking' || status.kind === 'downloading'}
          onClick={() => platform.updates!.check()}
        >
          <RefreshCw size={13} strokeWidth={2} aria-hidden />
          {t('update.check')}
        </button>
        {status.kind === 'ready' && (
          <button className="button is-primary" onClick={() => onInstall(status.version)}>
            {t('update.restart')}
          </button>
        )}
      </div>
    </section>
  );
}
