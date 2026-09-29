import path from 'node:path';

/** Why a folder cannot be a vault; each code has a sentence in packages/app/src/errors.ts. */
export type LocationProblem = 'app-data-folder' | 'too-broad' | 'vault-parent' | 'other-vault';

interface Context {
  /** The user's home folder. */
  home: string;
  /** The app's own data folder. */
  appData: string;
  /** When following a lost vault: where it used to be. */
  previous?: string;
  /** Folders of the other vaults in the recent list. */
  others?: string[];
}

const inside = (parent: string, child: string) => {
  const relative = path.relative(parent, child);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
};

/**
 * Checks a folder chosen as a vault. Opening the home folder or a whole drive
 * would index every file the user has (and freeze the app); following a lost
 * vault to the folder that used to contain it is the usual slip in the dialog.
 */
export function locationProblem(location: string, context: Context): LocationProblem | null {
  const folder = path.resolve(location);
  if (inside(context.appData, folder)) return 'app-data-folder';
  if (folder === path.parse(folder).root || folder === path.resolve(context.home)) return 'too-broad';
  if (context.previous && folder !== path.resolve(context.previous) && inside(folder, context.previous)) return 'vault-parent';
  if (context.others?.some((other) => path.resolve(other) === folder)) return 'other-vault';
  return null;
}
