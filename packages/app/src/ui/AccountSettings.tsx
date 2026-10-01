import { useEffect, useState, type FormEvent } from 'react';
import { LogOut } from 'lucide-react';
import {
  AccountFailure,
  accountDevices,
  currentAccount,
  deleteAccount,
  forgotPassword,
  onAccountChange,
  resetPassword,
  signIn,
  signOut,
  signOutDevice,
  signUp,
  verify,
  type AccountDevice,
  type AccountSession,
} from '../account';
import { t, type MessageKey } from '../i18n';
import { loadIdentity } from '../sync';
import { useSession } from './hooks';
import { Block } from './settings-parts';
import { ago, DeviceIcon } from './SyncStatus';

const KEYWORDS = 'compte account e-mail email mot de passe password connexion login inscription';
const ERRORS = ['invalid', 'weak', 'exists', 'wrong', 'unverified', 'expired', 'slow-down', 'offline', 'no-server', 'mail'];

type Mode = 'signin' | 'signup' | 'verify' | 'forgot' | 'reset';

function message(error: unknown): string {
  const code = error instanceof AccountFailure ? error.code : 'server';
  return t(`account.error.${ERRORS.includes(code) ? code : 'server'}` as MessageKey);
}

/** Settings › Account: sign up or in; then the account's devices. */
export function AccountSettings() {
  const session = useSession();
  const [account, setAccount] = useState<AccountSession | null | undefined>(undefined);
  useEffect(() => {
    void currentAccount(session.platform).then(setAccount);
    return onAccountChange(setAccount);
  }, [session]);
  if (account === undefined) return null;
  return account ? <SignedIn account={account} /> : <SignedOut />;
}

function SignedOut() {
  const session = useSession();
  const platform = session.platform;
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const run = async (event: FormEvent, action: () => Promise<void>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      if (e instanceof AccountFailure && e.code === 'unverified') {
        setMode('verify');
        setNote(t('account.codeSent', { email }));
      } else setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const go = (next: Mode) => {
    setMode(next);
    setError(null);
    setNote(null);
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, type = 'text', auto?: string) => (
    <label className="account-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type={type} value={value} autoComplete={auto} required onChange={(e) => set(e.target.value)} />
    </label>
  );

  return (
    <Block title={t('account.title')} keywords={KEYWORDS}>
      <p className="setting-note">{t('account.lead')}</p>
      {(mode === 'signin' || mode === 'signup') && (
        <div className="account-tabs" role="tablist" aria-label={t('account.title')}>
          <button role="tab" aria-selected={mode === 'signin'} onClick={() => go('signin')}>
            {t('account.signin')}
          </button>
          <button role="tab" aria-selected={mode === 'signup'} onClick={() => go('signup')}>
            {t('account.signup')}
          </button>
        </div>
      )}
      <form
        className="account-form"
        onSubmit={(e) =>
          void run(e, async () => {
            if (mode === 'signin') await signIn(platform, email, password);
            else if (mode === 'signup') {
              await signUp(platform, email, password);
              go('verify');
              setNote(t('account.codeSent', { email }));
            } else if (mode === 'verify') await verify(platform, email, code);
            else if (mode === 'forgot') {
              await forgotPassword(platform, email);
              go('reset');
              setNote(t('account.resetSent', { email }));
            } else {
              await resetPassword(platform, email, code, password);
              go('signin');
              setNote(t('account.resetDone'));
            }
          })
        }
      >
        {note && <p className="account-note">{note}</p>}
        {field('account-email', t('account.email'), email, setEmail, 'email', 'email')}
        {(mode === 'verify' || mode === 'reset') &&
          field('account-code', t('account.code'), code, setCode, 'text', 'one-time-code')}
        {(mode === 'signin' || mode === 'signup' || mode === 'reset') &&
          field(
            'account-password',
            mode === 'reset' ? t('account.newPassword') : t('account.password'),
            password,
            setPassword,
            'password',
            mode === 'signin' ? 'current-password' : 'new-password',
          )}
        {(mode === 'signup' || mode === 'reset') && <small className="account-hint">{t('account.passwordHint')}</small>}
        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}
        <div className="account-actions">
          {mode === 'signin' && (
            <button type="button" className="link-button" onClick={() => go('forgot')}>
              {t('account.forgot')}
            </button>
          )}
          {(mode === 'verify' || mode === 'forgot' || mode === 'reset') && (
            <button type="button" className="button is-ghost" onClick={() => go('signin')}>
              {t('sync.cancel')}
            </button>
          )}
          <button type="submit" className="button is-primary" disabled={busy}>
            {t(`account.submit.${mode}`)}
          </button>
        </div>
      </form>
    </Block>
  );
}

function SignedIn({ account }: { account: AccountSession }) {
  const session = useSession();
  const platform = session.platform;
  const [devices, setDevices] = useState<AccountDevice[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');

  const refresh = () =>
    void accountDevices(platform).then(setDevices, (e: unknown) => {
      setDevices([]);
      setError(message(e));
    });
  useEffect(() => {
    refresh();
    void session.sync
      .deviceName()
      .then(() => platform.storage.get<{ id: string }>('sync:identity').then((i) => setMe(i?.id ?? null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.token]);

  return (
    <Block
      title={t('account.signedIn', { email: account.email })}
      keywords={KEYWORDS}
      actions={
        <button className="button" onClick={() => void signOut(platform)}>
          <LogOut size={14} strokeWidth={2} aria-hidden />
          {t('account.signout')}
        </button>
      }
    >
      <p className="setting-note">{t('account.signedInLead')}</p>
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
      <ul className="sync-devices" aria-label={t('account.devices')}>
        {(devices ?? []).map((device) => (
          <li key={device.id} className="sync-device">
            <div className="sync-device-row">
              <span className="sync-device-icon">
                <DeviceIcon kind={device.kind === 'web' ? 'web' : device.kind === 'phone' ? 'phone' : 'desktop'} />
              </span>
              <div className="sync-device-text">
                <span className="sync-device-name">
                  {device.name}
                  {device.id === me && <span className="sync-tag">{t('sync.device.self')}</span>}
                </span>
                <span className="sync-device-state">{t('account.lastSeen', { when: ago(device.lastSeen) })}</span>
              </div>
              {device.id !== me && (
                <button className="button" onClick={() => void signOutDevice(platform, device.id).then(refresh)}>
                  {t('account.signoutDevice')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {deleting ? (
        <form
          className="sync-confirm"
          onSubmit={(e) => {
            e.preventDefault();
            void deleteAccount(platform, password).catch((err: unknown) => setError(message(err)));
          }}
        >
          <span>{t('account.deleteConfirm')}</span>
          <input
            type="password"
            aria-label={t('account.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="button" onClick={() => setDeleting(false)}>
            {t('sync.cancel')}
          </button>
          <button type="submit" className="button is-danger">
            {t('account.delete')}
          </button>
        </form>
      ) : (
        <button className="link-button account-delete" onClick={() => setDeleting(true)}>
          {t('account.delete')}
        </button>
      )}
    </Block>
  );
}
