import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { stem } from '@cobblestone/core';
import { t } from '../i18n';
import { useOutsideClick, useSession, useStore } from './hooks';

/**
 * Share popover. Live sharing needs sync, which is the next milestone; until
 * then it says so plainly and offers what already works.
 */
export function ShareSheet() {
  const session = useSession();
  const path = useStore(session.ui, (s) => s.share);
  const close = () => session.ui.setState({ share: null });
  const ref = useOutsideClick<HTMLDivElement>(close, !!path);
  const [copied, setCopied] = useState<string | null>(null);
  if (!path) return null;

  const copy = async (kind: 'link' | 'markdown') => {
    const text = kind === 'link' ? `[[${session.vault.cache.resolver.linkText(path, '')}]]` : await session.vault.read(path);
    await navigator.clipboard?.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="share-sheet" ref={ref} role="dialog" aria-label={t('share.title', { name: stem(path) })} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <header>
        <h2>{t('share.title', { name: stem(path) })}</h2>
        <button className="icon-button" onClick={close} aria-label={t('note.close')} autoFocus>
          <X size={16} strokeWidth={1.75} />
        </button>
      </header>
      <p>{t('share.soon')}</p>
      <div className="share-actions">
        <button className="button" onClick={() => void copy('link')}>
          {copied === 'link' ? <Check size={15} strokeWidth={2} aria-hidden /> : <Copy size={15} strokeWidth={1.75} aria-hidden />}
          {t('cmd.copyLink')}
        </button>
        <button className="button" onClick={() => void copy('markdown')}>
          {copied === 'markdown' ? <Check size={15} strokeWidth={2} aria-hidden /> : <Copy size={15} strokeWidth={1.75} aria-hidden />}
          Markdown
        </button>
      </div>
    </div>
  );
}
