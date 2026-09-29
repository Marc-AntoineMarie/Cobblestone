import { useEffect, useState } from 'react';
import { basename, extname } from '@cobblestone/core';
import { t } from '../i18n';
import { useSession } from './hooks';

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const AUDIO = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac']);
const VIDEO = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv']);
const TEXT = new Set(['txt', 'json', 'csv', 'canvas', 'css', 'js', 'ts', 'yaml', 'yml', 'xml', 'html', 'base']);

/** Attachments and other files: images, audio, video, PDFs and plain text. */
export function FileView({ path }: { path: string }) {
  const session = useSession();
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const ext = extname(path);

  useEffect(() => {
    let cancelled = false;
    if (TEXT.has(ext)) void session.vault.read(path).then((t) => !cancelled && setText(t));
    else void session.resourceUrl(path).then((u) => !cancelled && setUrl(u));
    return () => {
      cancelled = true;
    };
  }, [session, path, ext]);

  let body: React.ReactNode;
  if (IMAGE.has(ext)) body = url && <img src={url} alt={basename(path)} />;
  else if (AUDIO.has(ext)) body = url && <audio src={url} controls />;
  else if (VIDEO.has(ext)) body = url && <video src={url} controls />;
  else if (ext === 'pdf') body = url && <iframe src={url} title={basename(path)} />;
  else if (text !== null) body = <pre>{text}</pre>;
  else body = <p className="file-unsupported">{t('file.unsupported')}</p>;

  return (
    <div className={`file-view is-${IMAGE.has(ext) ? 'image' : ext === 'pdf' ? 'pdf' : 'other'}`}>
      <header className="file-name">{basename(path)}</header>
      <div className="file-body">{body}</div>
    </div>
  );
}
