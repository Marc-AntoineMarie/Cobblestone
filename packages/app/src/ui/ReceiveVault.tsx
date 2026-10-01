import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, FolderOpen, FolderPlus } from 'lucide-react';
import { readCode, SyncRefusal } from '@cobblestone/sync';
import { describeError } from '../errors';
import { t } from '../i18n';
import type { Platform, VaultEntry } from '../platform';
import { adoptReceived, loadIdentity, receiveWithCode, type Received } from '../sync';

type Stage = 'form' | 'searching' | 'waiting' | 'where';

const REASONS = ['wrong-code', 'timeout', 'declined'] as const;

/**
 * On the start screen: receive a vault from another device, with the code it
 * shows. Once the other user accepts, choose where the vault goes, and it opens.
 */
export function ReceiveVault({
  platform,
  onOpen,
  onClose,
}: {
  platform: Platform;
  onOpen: (entry: VaultEntry) => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>('form');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const received = useRef<Received | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    void loadIdentity(platform).then((identity) => setName(identity.name));
  }, [platform]);
  // Leaving before the vault opens ends the link with the other device.
  useEffect(
    () => () => {
      alive.current = false;
      received.current?.channel.close();
    },
    [],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const typed = readCode(code);
    if (!typed) return setError(t('receive.error.invalid'));
    setError(null);
    setStage('searching');
    try {
      const link = await receiveWithCode(platform, typed, name, () => alive.current && setStage('waiting'));
      if (!alive.current) return link.channel.close();
      received.current = link;
      setStage('where');
    } catch (e) {
      if (!alive.current) return;
      const reason = e instanceof SyncRefusal && (REASONS as readonly string[]).includes(e.code) ? e.code : 'other';
      setError(t(`receive.error.${reason as (typeof REASONS)[number] | 'other'}`));
      setStage('form');
    }
  };

  const place = async (how: 'new' | 'existing') => {
    const link = received.current;
    if (!link) return;
    setError(null);
    try {
      const entry = how === 'new' ? await platform.createVault(link.vault.name) : await platform.pickFolder();
      if (!entry) return;
      await adoptReceived(platform, entry, link);
      received.current = null;
      onOpen(entry);
    } catch (e) {
      setError(t('launcher.error', { error: describeError(e) }));
    }
  };

  return (
    <section className="receive" aria-labelledby="receive-title">
      <h2 id="receive-title" className="receive-title">
        {t('launcher.receive')}
      </h2>
      {stage === 'where' && received.current ? (
        <>
          <p className="receive-accepted" role="status">
            <span className="receive-check">
              <Check size={13} strokeWidth={3} aria-hidden />
            </span>
            {t('receive.accepted', { name: received.current.host.name })}
          </p>
          <div className="receive-question">
            <h3>{t('receive.where')}</h3>
            <p>{t('receive.where.hint')}</p>
          </div>
          <div className="receive-places">
            <button className="launch-action is-primary" onClick={() => void place('new')}>
              <FolderPlus size={20} strokeWidth={1.75} aria-hidden />
              <span className="launch-action-text">
                <strong>{t('receive.newFolder')}</strong>
                <span>{t('receive.newFolder.hint', { name: received.current.vault.name })}</span>
              </span>
            </button>
            <button className="launch-action" onClick={() => void place('existing')}>
              <FolderOpen size={20} strokeWidth={1.75} aria-hidden />
              <span className="launch-action-text">
                <strong>{t('receive.existingFolder')}</strong>
                <span>{t('receive.existingFolder.hint')}</span>
              </span>
            </button>
          </div>
        </>
      ) : (
        <form className="receive-form" onSubmit={(e) => void submit(e)}>
          <p>{t('receive.text')}</p>
          <div className="receive-field">
            <label htmlFor="receive-code">{t('receive.code')}</label>
            <input
              id="receive-code"
              className="receive-code"
              value={code}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="K7M 4QX 92P"
              aria-describedby="receive-code-hint"
              disabled={stage !== 'form'}
              onChange={(e) => setCode(e.target.value)}
            />
            <small id="receive-code-hint">{t('receive.code.hint')}</small>
          </div>
          <div className="receive-field">
            <label htmlFor="receive-name">{t('receive.name')}</label>
            <input
              id="receive-name"
              value={name}
              maxLength={80}
              aria-describedby="receive-name-hint"
              disabled={stage !== 'form'}
              onChange={(e) => setName(e.target.value)}
            />
            <small id="receive-name-hint">{t('receive.name.hint')}</small>
          </div>
          {stage !== 'form' && (
            <p className="pair-waiting" role="status">
              <span className="pair-dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              {stage === 'searching' ? t('receive.searching') : t('receive.waiting')}
            </p>
          )}
          <div className="receive-actions">
            <button type="button" className="button is-ghost" onClick={onClose}>
              {t('launcher.cancel')}
            </button>
            <button type="submit" className="button is-primary" disabled={stage !== 'form'}>
              {t('receive.continue')}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="launcher-status is-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
