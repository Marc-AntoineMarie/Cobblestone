import { useState } from 'react';
import { FolderOpen, FolderPlus } from 'lucide-react';
import { linkState, offersChanged } from '../account-link';
import { describeError } from '../errors';
import { t } from '../i18n';
import type { Platform, VaultEntry } from '../platform';
import { adoptOffer } from '../sync';
import { useStore } from './hooks';

/** On the start screen: the account's vaults not on this device yet, one click from here. */
export function AccountOffers({ platform, onOpen }: { platform: Platform; onOpen: (entry: VaultEntry) => void }) {
  const offers = useStore(linkState, (s) => s.offers);
  const [error, setError] = useState<string | null>(null);
  if (!offers.length) return null;
  const take = async (offer: (typeof offers)[number], how: 'new' | 'existing') => {
    setError(null);
    try {
      const entry = how === 'new' ? await platform.createVault(offer.name) : await platform.pickFolder();
      if (!entry) return;
      await adoptOffer(platform, entry, offer);
      await offersChanged(platform);
      onOpen(entry);
    } catch (e) {
      setError(t('launcher.error', { error: describeError(e) }));
    }
  };
  return (
    <section className="launcher-recent account-offers" aria-labelledby="offers-title">
      <h2 id="offers-title" className="label">
        {t('offers.title')}
      </h2>
      <ul>
        {offers.map((offer) => (
          <li key={offer.id} className="recent-row">
            <span className="recent-open">
              <span className="recent-name">{offer.name}</span>
              <span className="recent-where">{t('offers.from', { device: offer.from })}</span>
            </span>
            <button className="button is-primary" onClick={() => void take(offer, 'new')}>
              <FolderPlus size={15} strokeWidth={1.75} aria-hidden />
              {t('offers.new')}
            </button>
            <button className="button" onClick={() => void take(offer, 'existing')}>
              <FolderOpen size={15} strokeWidth={1.75} aria-hidden />
              {t('offers.existing')}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="launcher-status is-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
