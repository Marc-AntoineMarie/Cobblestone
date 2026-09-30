import type { Files } from './cobble';

/** A 1×1 PNG, for attachments. */
export const PNG = Uint8Array.from(
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
);

export const CANVAS = JSON.stringify(
  {
    nodes: [
      { id: '1a2b3c4d5e6f7a8b', type: 'text', text: '# Idée\nUne **carte**', x: 0, y: 0, width: 250, height: 120, color: '4' },
      { id: '9a8b7c6d5e4f3a2b', type: 'file', file: 'Projets/Plan.md', x: 320, y: 0, width: 400, height: 300 },
      { id: 'c0ffee00c0ffee00', type: 'group', label: 'Groupe', x: -40, y: -60, width: 800, height: 420 },
    ],
    edges: [
      { id: 'e1', fromNode: '1a2b3c4d5e6f7a8b', fromSide: 'right', toNode: '9a8b7c6d5e4f3a2b', toSide: 'left', label: 'mène à' },
    ],
  },
  null,
  '\t',
);

/**
 * The vault most checks start from: a few linked notes in folders, tags,
 * properties, a template, an attachment and a canvas.
 */
export function baseVault(extra: Files = {}): Files {
  return {
    'Bienvenue.md': '# Bienvenue\n\nVoir le [[Plan]] et les [[Idées]].\n\n#accueil\n',
    'Idées.md': "Le plan avance. Une idée pour l'étude.\n\n#idee\n",
    'Étude.md': '---\ntags: [recherche]\naliases: [Recherche]\n---\n# Étude\n\nNotes sur la recherche.\n',
    'Projets/Plan.md':
      '---\nstatut: actif\ntags: [projet/alpha]\n---\n# Plan\n\n## Étapes\n\n- [ ] Écrire\n- [x] Relire\n\nRetour à [[Bienvenue]]. ^bloc-un\n\n## Suite\n\nLa suite.\n',
    'Projets/Réunion.md': '# Réunion\n\nOn relit le [[Plan|plan]] ligne par ligne. #projet\n',
    'Journal/2026-09-29.md': 'Journée calme. #journal\n',
    'Modèles/Quotidien.md': '# {{title}}\n\n{{date}} {{time}}\n',
    'assets/image.png': PNG,
    'Tableau.canvas': CANVAS,
    ...extra,
  };
}

/** An Obsidian vault with its configuration, as migration checks need. */
export function obsidianVault(extra: Files = {}): Files {
  return baseVault({
    '.obsidian/app.json': JSON.stringify({
      attachmentFolderPath: 'assets',
      newFileLocation: 'folder',
      newFileFolderPath: 'Boîte',
      strictLineBreaks: true,
      defaultViewMode: 'preview',
    }),
    '.obsidian/appearance.json': JSON.stringify({ baseFontSize: 18 }),
    '.obsidian/daily-notes.json': JSON.stringify({ folder: 'Journal', format: 'DD-MM-YYYY', template: 'Modèles/Quotidien' }),
    '.obsidian/bookmarks.json': JSON.stringify({
      items: [
        { type: 'file', ctime: 1, path: 'Bienvenue.md' },
        { type: 'group', ctime: 2, title: 'Travail', items: [{ type: 'file', ctime: 3, path: 'Projets/Plan.md' }] },
      ],
    }),
    '.trash/Ancienne.md': 'jetée',
    '.git/HEAD': 'ref: refs/heads/main',
    'Boîte/.keep': '',
    ...extra,
  });
}

/** A large vault: n short notes in folders of `perFolder`. */
export function manyNotes(n: number, perFolder = 100): Files {
  const files: Files = {};
  for (let i = 0; i < n; i++)
    files[`Dossier ${Math.floor(i / perFolder)}/Note ${i}.md`] =
      `# Note ${i}\n\nLien vers [[Note ${(i + 1) % n}]]. #tag${i % 7}\n`;
  return files;
}
