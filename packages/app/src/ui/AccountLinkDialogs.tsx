import { Check, ShieldCheck, X } from 'lucide-react';
import { answerRequest, linkState } from '../account-link';
import { t } from '../i18n';
import { useStore } from './hooks';
import { DeviceIcon } from './SyncStatus';

/** Another device of the account asks to be let in; or this one waits for that. */
export function AccountLinkDialogs() {
  const request = useStore(linkState, (s) => s.request);
  const waiting = useStore(linkState, (s) => s.waiting);
  return (
    <>
      {request && (
        <div className="dialog-backdrop">
          <section className="dialog pair-dialog" role="dialog" aria-modal="true" aria-labelledby="link-title">
            <header className="dialog-head">
              <h2 id="link-title">{t('link.title')}</h2>
              <button className="icon-button" aria-label={t('pair.close')} onClick={() => answerRequest(false)}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>
            <div className="pair-body">
              <div className="pair-device">
                <span className="sync-device-icon">
                  <DeviceIcon kind={request.device.kind} size={24} />
                </span>
                <span>
                  <strong>{request.device.name}</strong>
                  <span>{t(`sync.kind.${request.device.kind}`)}</span>
                </span>
              </div>
              <p>{t('link.compare')}</p>
              <div className="pair-code-box">
                <p className="pair-code" aria-label={t('pair.code.label', { code: request.check })}>
                  {request.check.split(' ').map((part) => (
                    <span key={part}>{part}</span>
                  ))}
                </p>
              </div>
              <p className="pair-warning">
                <ShieldCheck size={16} strokeWidth={2} aria-hidden />
                {t('link.warning')}
              </p>
              <div className="dialog-actions">
                <button className="button" onClick={() => answerRequest(false)}>
                  {t('pair.decline')}
                </button>
                <button className="button is-primary" autoFocus onClick={() => answerRequest(true)}>
                  <Check size={15} strokeWidth={2.25} aria-hidden />
                  {t('link.accept', { name: request.device.name })}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      {waiting && (
        <aside className="update-ready link-waiting" role="status">
          <ShieldCheck size={16} strokeWidth={2} aria-hidden />
          <span>{t('link.waiting')}</span>
          <strong className="link-check">{waiting}</strong>
        </aside>
      )}
    </>
  );
}
