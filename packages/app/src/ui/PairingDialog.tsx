import { useEffect, useState } from 'react';
import { Check, Copy, ShieldAlert, X } from 'lucide-react';
import { formatCode } from '@cobblestone/sync';
import { t } from '../i18n';
import type { PairingState } from '../sync';
import { useSession, useStore } from './hooks';
import { DeviceIcon } from './SyncStatus';

const STEPS = ['pair.step.code', 'pair.step.approve', 'pair.step.copy'] as const;

function remaining(expires: number, now: number): string {
  const seconds = Math.max(0, Math.round((expires - now) / 1000));
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`;
}

/** Adding a device: the code to type on it, then accepting it, then the copy under way. */
export function PairingDialog() {
  const session = useSession();
  const pairing = useStore(session.sync.state, (s) => s.pairing);
  if (!pairing) return null;
  const close = () => session.sync.closePairing();
  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <section
        className="dialog pair-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pair-title"
        onKeyDown={(e) => e.key === 'Escape' && close()}
      >
        <header className="dialog-head">
          <h2 id="pair-title">{t('pair.title')}</h2>
          <button className="icon-button" aria-label={t('pair.close')} onClick={close}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>
        {pairing.stage !== 'failed' && <Steps current={pairing.stage === 'code' ? 0 : pairing.stage === 'approve' ? 1 : 2} />}
        <Stage pairing={pairing} onClose={close} />
      </section>
    </div>
  );
}

function Steps({ current }: { current: number }) {
  return (
    <ol className="pair-steps" aria-label={t('pair.steps')}>
      {STEPS.map((key, index) => (
        <li
          key={key}
          className={index < current ? 'is-done' : index === current ? 'is-current' : undefined}
          aria-current={index === current ? 'step' : undefined}
        >
          <span className="pair-step-mark">{index < current ? <Check size={12} strokeWidth={3} aria-hidden /> : index + 1}</span>
          {t(key)}
        </li>
      ))}
    </ol>
  );
}

function Stage({ pairing, onClose }: { pairing: PairingState; onClose: () => void }) {
  const session = useSession();
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const counting = pairing.stage === 'code';
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [counting]);

  switch (pairing.stage) {
    case 'code': {
      const code = formatCode(pairing.code);
      return (
        <div className="pair-body">
          <p>{t('pair.code.text')}</p>
          <div className="pair-code-box">
            <p className="pair-code" aria-label={t('pair.code.label', { code: [...pairing.code].join(' ') })}>
              {code.split(' ').map((group) => (
                <span key={group}>{group}</span>
              ))}
            </p>
            <p className="pair-expires">{t('pair.code.expires', { time: remaining(pairing.expires, now) })}</p>
          </div>
          <button
            className="button pair-copy"
            onClick={() => {
              void navigator.clipboard?.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? <Check size={14} strokeWidth={2} aria-hidden /> : <Copy size={14} strokeWidth={1.75} aria-hidden />}
            {copied ? t('pair.copied') : t('pair.copy')}
          </button>
          <p className="pair-waiting" role="status">
            <span className="pair-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            {t('pair.waiting')}
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={onClose}>
              {t('sync.cancel')}
            </button>
          </div>
        </div>
      );
    }
    case 'approve':
      return (
        <div className="pair-body">
          <p>{t('pair.approve.text')}</p>
          <div className="pair-device">
            <span className="sync-device-icon">
              <DeviceIcon kind={pairing.device.kind} size={24} />
            </span>
            <span>
              <strong>{pairing.device.name}</strong>
              <span>{t(`sync.kind.${pairing.device.kind}`)}</span>
            </span>
          </div>
          <p className="pair-warning">
            <ShieldAlert size={16} strokeWidth={2} aria-hidden />
            {t('pair.approve.warning')}
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={() => session.sync.answerPairing(false)}>
              {t('pair.decline')}
            </button>
            <button className="button is-primary" autoFocus onClick={() => session.sync.answerPairing(true)}>
              <Check size={15} strokeWidth={2.25} aria-hidden />
              {t('pair.accept', { name: pairing.device.name })}
            </button>
          </div>
        </div>
      );
    case 'done':
      return (
        <div className="pair-body">
          <h3 className="pair-done">{t('pair.done.title', { name: pairing.device.name })}</h3>
          <p>{t('pair.done.text')}</p>
          <div className="dialog-actions">
            <button className="button is-primary" autoFocus onClick={onClose}>
              {t('pair.finish')}
            </button>
          </div>
        </div>
      );
    case 'failed': {
      const reason = ['wrong-code', 'timeout', 'declined'].includes(pairing.reason) ? pairing.reason : 'other';
      return (
        <div className="pair-body">
          <h3 className="pair-done">{t('pair.failed.title')}</h3>
          <p>{t(`pair.failed.${reason as 'wrong-code' | 'timeout' | 'declined' | 'other'}`)}</p>
          <div className="dialog-actions">
            <button className="button" onClick={onClose}>
              {t('pair.close')}
            </button>
            <button className="button is-primary" autoFocus onClick={() => void session.sync.addDevice()}>
              {t('pair.retry')}
            </button>
          </div>
        </div>
      );
    }
  }
}
