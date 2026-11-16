import { stem } from '@cobblestone/core';
import { isBookmarked } from '../bookmarks';
import { t } from '../i18n';
import type { MenuItem, Session } from '../session';

/** Picks a folder for a note or folder, then moves it there. */
export function moveToFolder(session: Session, path: string) {
  const folders = session.vault
    .getFolders()
    .filter((f) => f.path !== path && !f.path.startsWith(path + '/') && !f.path.split('/').some((p) => p.startsWith('.')))
    .sort((a, b) => a.path.localeCompare(b.path));
  session.ui.setState({
    finder: {
      mode: 'pick',
      placeholder: t('mobile.moveToPlaceholder', { name: stem(path) }),
      items: [
        { id: '', label: session.vault.name, detail: t('mobile.vaultRoot') },
        ...folders.map((f) => ({ id: f.path, label: f.path })),
      ],
      onPick: (folder) => void session.move(path, folder),
    },
  });
}

/** Long press on a note in the home lists. */
export function fileMenu(session: Session, path: string): MenuItem[] {
  const pinned = isBookmarked(session.bookmarks.getState(), path);
  const isNote = path.endsWith('.md');
  return [
    { label: pinned ? t('mobile.unpin') : t('mobile.pin'), run: () => session.toggleBookmark(path) },
    ...(isNote ? [{ label: t('note.share'), run: () => session.ui.setState({ share: path }) }] : []),
    {
      label: t('tree.rename'),
      run: () => {
        session.openPath(path);
        session.ui.setState({ focusTitle: path });
      },
    },
    { label: t('mobile.moveTo'), run: () => moveToFolder(session, path) },
    { label: t('tree.duplicate'), run: () => void session.duplicate(path) },
    { label: t('tree.delete'), run: () => void session.delete(path), danger: true, separatorBefore: true },
  ];
}

/** Long press on a folder in the home lists. */
export function folderMenu(session: Session, path: string): MenuItem[] {
  const pinned = session.bookmarks.getState().some((b) => b.type === 'folder' && b.path === path);
  return [
    { label: t('tree.newNoteHere'), run: () => void session.createNote(path) },
    { label: t('tree.newFolderHere'), run: () => void session.createFolder(path) },
    { label: t('tree.newCanvasHere'), run: () => void session.createCanvas(path) },
    { label: pinned ? t('mobile.unpin') : t('mobile.pin'), run: () => session.toggleBookmark(path), separatorBefore: true },
    { label: t('tree.rename'), run: () => session.ui.setState({ renaming: path }) },
    { label: t('mobile.moveTo'), run: () => moveToFolder(session, path) },
    { label: t('tree.delete'), run: () => void session.delete(path), danger: true, separatorBefore: true },
  ];
}
