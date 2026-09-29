import { useEffect, useState } from 'react';
import { describeError } from '../errors';
import { t } from '../i18n';
import type { MovedVault, Platform, VaultEntry } from '../platform';

interface Props {
  platform: Platform;
  entry: VaultEntry;
  /** Over an open vault rather than on the launcher. */
  inWorkspace?: boolean;
  /** Opens the vault at its new place. */
  onFollow: (entry: VaultEntry) => void;
  /** Launcher only: removes the vault from the recent list. */
  onForget?: () => void;
  /** Launcher: dismisses the notice. Workspace: closes the vault. */
  onClose: () => void;
}

/**
 * A vault whose folder is no longer where it was. The desktop app looks for
 * it (a renamed or moved folder keeps its identity on disk) and offers to
 * follow it; otherwise the user points to the folder again.
 */
export function LostVault({ platform, entry, inWorkspace = false, onFollow, onForget, onClose }: Props) {
  /** undefined while looking, null when not found. */
  const [found, setFound] = useState<MovedVault | null | undefined>(platform.findMovedVault ? undefined : null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!platform.findMovedVault) return;
    let cancelled = false;
    setFound(undefined);
    platform.findMovedVault(entry).then(
      (result) => !cancelled && setFound(result),
      () => !cancelled && setFound(null),
    );
    return () => {
      cancelled = true;
    };
  }, [platform, entry]);

  const relocate = async (target?: MovedVault) => {
    setFailure(null);
    try {
      const moved = await platform.relocateVault(entry, target);
      if (moved) onFollow(moved);
    } catch (e) {
      setFailure(describeError(e));
    }
  };

  const canPick = entry.kind === 'folder';
  const title =
    found === undefined
      ? t('lost.searching', { name: entry.name })
      : found
        ? t('lost.foundTitle', { name: entry.name, newName: found.name })
        : t('lost.missingTitle', { name: entry.name });
  const hint = found ? t('lost.foundHint') : platform.kind === 'web' ? t('lost.missingHintWeb') : t('lost.missingHint');

  return (
    <section
      className={`lost-vault${inWorkspace ? ' is-sheet' : ''}`}
      role="alertdialog"
      aria-labelledby="lost-title"
      aria-describedby="lost-hint"
      aria-busy={found === undefined}
      onKeyDown={(e) => !inWorkspace && e.key === 'Escape' && onClose()}
    >
      <h2 id="lost-title">{title}</h2>
      {found !== undefined && (
        <>
          <p id="lost-hint">{hint}</p>
          {entry.location && (
            <dl className="lost-paths">
              <dt>{t('lost.before')}</dt>
              <dd>{entry.location}</dd>
              {found && (
                <>
                  <dt>{t('lost.now')}</dt>
                  <dd>{found.location}</dd>
                </>
              )}
            </dl>
          )}
        </>
      )}
      {failure && (
        <p className="lost-error" role="alert">
          {failure}
        </p>
      )}
      <div className="lost-actions">
        {found ? (
          <>
            <button className="button is-primary" autoFocus onClick={() => void relocate(found)}>
              {inWorkspace ? t('lost.followOpen') : t('lost.follow')}
            </button>
            <button className="button" onClick={() => void relocate()}>
              {t('lost.pickOther')}
            </button>
          </>
        ) : (
          found === null &&
          canPick && (
            <button className="button is-primary" autoFocus onClick={() => void relocate()}>
              {t('lost.pick')}
            </button>
          )
        )}
        {onForget && found !== undefined && (
          <button className="button is-ghost" onClick={onForget}>
            {t('launcher.forget')}
          </button>
        )}
        <button className="button is-ghost" onClick={onClose}>
          {inWorkspace ? t('lost.closeVault') : t('lost.later')}
        </button>
      </div>
    </section>
  );
}
