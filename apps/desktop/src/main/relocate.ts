import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * A folder's identity on disk (device and inode). It survives renames and
 * moves on the same drive, and a copy gets a new one.
 */
export async function folderId(location: string): Promise<string | undefined> {
  try {
    const stat = await fs.stat(location, { bigint: true });
    return stat.isDirectory() ? `${stat.dev}:${stat.ino}` : undefined;
  } catch {
    return undefined;
  }
}

/** Where to look, and how many levels deep. */
export type SearchArea = [folder: string, depth: number];

/** The usual places a vault folder ends up after a rename or a move. */
export function searchAreas(oldLocation: string, home: string): SearchArea[] {
  const parent = path.dirname(oldLocation);
  return [
    [parent, 2], // renamed in place, or moved into a neighbouring folder
    [path.dirname(parent), 2], // moved a little further
    [home, 3], // moved somewhere in the user's folders
  ];
}

/**
 * Finds the folder with this identity in the given areas, nearest first.
 * Hidden folders (the trash among them) and node_modules are skipped, and the
 * search stops after `budget` folders, so a lost vault never stalls the app.
 */
export async function findFolder(id: string, areas: SearchArea[], budget = 20_000): Promise<string | null> {
  const checked = new Set<string>();
  for (const [start, depth] of areas) {
    let level = [start];
    for (let d = 0; d < depth && level.length > 0; d++) {
      const next: string[] = [];
      for (const folder of level) {
        const entries = await fs.readdir(folder, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          const candidate = path.join(folder, entry.name);
          next.push(candidate);
          // Areas overlap: a folder is checked once, but a deeper area still looks inside it.
          if (checked.has(candidate)) continue;
          checked.add(candidate);
          if ((await folderId(candidate)) === id) return candidate;
          if (--budget <= 0) return null;
        }
      }
      level = next;
    }
  }
  return null;
}
