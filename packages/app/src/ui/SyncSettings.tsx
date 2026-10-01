import { useEffect, useState, type FormEvent } from 'react';
import { Info, Lock, Pause, Play, Plus, Power, TriangleAlert, Wifi } from 'lucide-react';
import { stem } from '@cobblestone/core';
import type { DeviceStatus } from '@cobblestone/sync';
import { t } from '../i18n';
import { relaySettings, setRelaySettings, type RelaySettings, type SyncState } from '../sync';
import { useSession, useStore } from './hooks';
import { Block, Row, Toggle } from './settings-parts';
import { DeviceIcon, describeState, SyncStateText, syncSummary, useConflictCopies, useNow } from './SyncStatus';

const KEYWORDS = 'sync synchronisation synchroniser appareil device devices code pair appairer';

/** Settings › Sync: the first time, how to add a device; then the vault's devices and where the sync stands. */
export function SyncSettings() {
  const session = useSession();
  const state = useStore(session.sync.state, (s) => s);
  if (!state.available) {
    return (
      <Block title={t('settings.sync')} keywords={KEYWORDS}>
        <p className="setting-note">{session.entry.kind === 'demo' ? t('sync.demo') : t('sync.unavailable')}</p>
      </Block>
    );
  }
  return state.enabled ? <SyncedVault state={state} /> : <FirstTime />;
}

function FirstTime() {
  const session = useSession();
  return (
    <>
      <Block title={t('sync.first.title')} keywords={KEYWORDS}>
        <div className="sync-first">
          <div className="sync-first-main">
            <SyncPicture />
            <p>{t('sync.first.text')}</p>
            <button className="button is-primary sync-add" onClick={() => void session.sync.addDevice()}>
              <Plus size={16} strokeWidth={2.25} aria-hidden />
              {t('sync.addDevice')}
            </button>
          </div>
          <div className="sync-how">
            <h4 className="label">{t('sync.how')}</h4>
            <ol>
              {([1, 2, 3] as const).map((n) => (
                <li key={n}>
                  <span className="sync-how-number">{n}</span>
                  <span>
                    <strong>{t(`sync.how.${n}.title`)}</strong>
                    <span>{t(`sync.how.${n}`)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Block>
      <DeviceNameRow />
      <InternetRows />
      <Block title={t('sync.know')} keywords={KEYWORDS}>
        <ul className="sync-know">
          <li>
            <Lock size={16} strokeWidth={2} aria-hidden />
            <span>
              <strong>{t('sync.know.encrypted.title')}</strong> {t('sync.know.encrypted')}
            </span>
          </li>
          <li>
            <Wifi size={16} strokeWidth={2} aria-hidden />
            <span>
              <strong>{t('sync.know.network.title')}</strong> {t('sync.know.network')}
            </span>
          </li>
          <li>
            <Power size={16} strokeWidth={2} aria-hidden />
            <span>
              <strong>{t('sync.know.online.title')}</strong> {t('sync.know.online')}
            </span>
          </li>
        </ul>
      </Block>
    </>
  );
}

/** Two devices and a padlock between them, in the house inks. */
function SyncPicture() {
  return (
    <svg className="sync-picture" width="300" height="112" viewBox="0 0 300 112" fill="none" aria-hidden>
      <rect x="18" y="22" width="88" height="58" rx="5" className="sync-picture-screen" />
      <path d="M6 88h112l-6 10H12z" className="sync-picture-base" />
      <rect x="28" y="32" width="40" height="5" rx="2" className="sync-picture-ink" />
      <rect x="28" y="44" width="64" height="3" rx="1.5" className="sync-picture-line" />
      <rect x="28" y="52" width="56" height="3" rx="1.5" className="sync-picture-line" />
      <rect x="28" y="60" width="60" height="3" rx="1.5" className="sync-picture-line" />
      <rect x="186" y="14" width="100" height="68" rx="5" className="sync-picture-screen" />
      <path d="M236 82v12M222 98h28" className="sync-picture-stand" />
      <rect x="198" y="26" width="40" height="5" rx="2" className="sync-picture-empty" />
      <rect x="198" y="38" width="72" height="3" rx="1.5" className="sync-picture-empty" />
      <rect x="198" y="46" width="62" height="3" rx="1.5" className="sync-picture-empty" />
      <path d="M124 52h56" className="sync-picture-link" />
      <circle cx="151" cy="52" r="16" className="sync-picture-lock" />
      <rect x="144" y="51" width="14" height="10" rx="2" className="sync-picture-stand" />
      <path d="M147 51v-3a4 4 0 0 1 8 0v3" className="sync-picture-stand" />
    </svg>
  );
}

/** Over the Internet, through a relay: on or off, and which one. */
function InternetRows() {
  const session = useSession();
  const [settings, setSettings] = useState<RelaySettings | null>(null);
  useEffect(() => {
    void relaySettings(session.platform).then(setSettings);
  }, [session]);
  if (!settings) return null;
  const save = (next: RelaySettings) => {
    setSettings(next);
    void setRelaySettings(session.platform, next);
  };
  return (
    <>
      <Row label={t('sync.internet')} hint={t('sync.internet.hint')} keywords={`${KEYWORDS} internet relais relay`}>
        <Toggle
          id="sync-internet"
          checked={settings.enabled}
          label={t('sync.internet')}
          onChange={(enabled) => save({ ...settings, enabled })}
        />
      </Row>
      {settings.enabled && (
        <Row
          label={t('sync.relay')}
          hint={t('sync.relay.hint')}
          htmlFor="sync-relay"
          keywords={`${KEYWORDS} internet relais relay`}
        >
          <input
            id="sync-relay"
            value={settings.url}
            placeholder="sync.exemple.fr"
            spellCheck={false}
            onChange={(e) => setSettings({ ...settings, url: e.target.value })}
            onBlur={() => save(settings)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </Row>
      )}
    </>
  );
}

function DeviceNameRow() {
  const session = useSession();
  const [name, setName] = useState('');
  useEffect(() => {
    void session.sync.deviceName().then(setName);
  }, [session]);
  return (
    <Row label={t('sync.deviceName')} hint={t('sync.deviceName.hint')} htmlFor="sync-device-name" keywords={KEYWORDS}>
      <input
        id="sync-device-name"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => void session.sync.renameThisDevice(name)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </Row>
  );
}

function SyncedVault({ state }: { state: SyncState }) {
  const session = useSession();
  const now = useNow();
  const summary = syncSummary(state);
  const devices = state.devices.filter((d) => !d.removed);
  return (
    <>
      <Block
        title={devices.length > 1 ? t('sync.count', { count: devices.length }) : t('sync.count.one')}
        keywords={KEYWORDS}
        actions={
          <div className="sync-head-actions">
            <button className="button" onClick={() => (state.paused ? session.sync.resume() : session.sync.pause())}>
              {state.paused ? <Play size={14} strokeWidth={2} aria-hidden /> : <Pause size={14} strokeWidth={2} aria-hidden />}
              {state.paused ? t('sync.resume') : t('sync.pause')}
            </button>
            <button className="button is-primary" onClick={() => void session.sync.addDevice()}>
              <Plus size={15} strokeWidth={2.25} aria-hidden />
              {t('sync.addDevice')}
            </button>
          </div>
        }
      >
        <p className="setting-note">{t('sync.lead.synced')}</p>
        <div className={`sync-band is-${summary.kind}`} role="status">
          <div className="sync-band-text">
            <SyncStateText summary={summary} />
            <span>{describeState(state, summary, now)}</span>
          </div>
          <span className="sync-band-lock">
            <Lock size={13} strokeWidth={2} aria-hidden />
            {t('sync.encrypted')}
          </span>
        </div>
        <Conflicts />
      </Block>
      <Block title={t('sync.devices')} keywords={KEYWORDS}>
        <ul className="sync-devices">
          {devices.map((device) => (
            <DeviceRow key={device.id} device={device} />
          ))}
        </ul>
        <p className="sync-note">
          <Info size={15} strokeWidth={2} aria-hidden />
          {t('sync.networkNote')}
        </p>
      </Block>
      <InternetRows />
    </>
  );
}

function Conflicts() {
  const session = useSession();
  const copies = useConflictCopies();
  if (!copies.length) return null;
  return (
    <div className="sync-conflicts">
      <TriangleAlert size={17} strokeWidth={2} aria-hidden />
      <div>
        <strong>{t('sync.conflicts.title')}</strong>
        <p>{t('sync.conflicts.text')}</p>
        <ul>
          {copies.map((path) => (
            <li key={path}>
              <button className="link-button" onClick={() => session.openPath(path)}>
                {stem(path)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DeviceRow({ device }: { device: DeviceStatus }) {
  const session = useSession();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(device.name);
  const [confirming, setConfirming] = useState(false);
  const save = (event?: FormEvent) => {
    event?.preventDefault();
    void session.sync.renameThisDevice(name);
    setEditing(false);
  };
  const state = device.self ? t(`sync.kind.${device.kind}`) : device.online ? t('sync.device.online') : t('sync.device.offline');
  return (
    <li className="sync-device">
      <div className="sync-device-row">
        <span className="sync-device-icon">
          <DeviceIcon kind={device.kind} />
        </span>
        <div className="sync-device-text">
          {editing ? (
            <form onSubmit={save}>
              <input
                aria-label={t('sync.deviceName')}
                value={name}
                maxLength={80}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
              />
            </form>
          ) : (
            <span className="sync-device-name">
              {device.name}
              {device.self && <span className="sync-tag">{t('sync.device.self')}</span>}
            </span>
          )}
          <span className="sync-device-state">
            <span className={`sync-dot${device.self || device.online ? ' is-on' : ''}`} aria-hidden />
            {state}
          </span>
        </div>
        {device.self ? (
          editing ? (
            <button className="button" onClick={() => save()}>
              {t('sync.renameDone')}
            </button>
          ) : (
            <button
              className="button"
              onClick={() => {
                setName(device.name);
                setEditing(true);
              }}
            >
              {t('sync.rename')}
            </button>
          )
        ) : (
          <button className="button" aria-expanded={confirming} onClick={() => setConfirming(true)}>
            {t('sync.remove')}
          </button>
        )}
      </div>
      {confirming && (
        <div className="sync-confirm" role="group" aria-label={t('sync.remove')}>
          <span>{t('sync.remove.confirm', { name: device.name })}</span>
          <button className="button" onClick={() => setConfirming(false)}>
            {t('sync.cancel')}
          </button>
          <button className="button is-danger" autoFocus onClick={() => session.sync.removeDevice(device.id)}>
            {t('sync.remove')}
          </button>
        </div>
      )}
    </li>
  );
}
