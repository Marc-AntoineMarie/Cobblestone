// Change journal: one file per change in contribution/journal/, a summary in contribution/JOURNAL.md.
//   node scripts/journal.mjs                 checks the entries, the summary, and that every merged branch has its entry
//   node scripts/journal.mjs new             drafts the entry of the current branch from git (commits, files)
//   node scripts/journal.mjs new --merge SHA drafts the entry of a branch already merged by SHA
//   node scripts/journal.mjs index           rewrites the summary
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';

const dir = 'contribution/journal';
const summaryFile = 'contribution/JOURNAL.md';
/** Merges up to this commit are summed up in the history entry; every later one needs its own. */
const START = 'c0f53aa';
const TYPES = ['nouveauté', 'correction', 'amélioration', 'documentation', 'maintenance'];
const SECTIONS = ['Pourquoi', 'Ajouté', 'Modifié', 'Supprimé', 'Tests', 'Fichiers', 'Commits'];
const TODO = 'À compléter.';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

function read(file) {
  const text = readFileSync(path.join(dir, file), 'utf8');
  const errors = [];
  const meta = {};
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!front) errors.push('en-tête « --- » manquant');
  else
    for (const line of front[1].split('\n')) {
      const match = /^(\w+):\s*(.*)$/.exec(line);
      if (match) meta[match[1]] = match[2].trim();
    }
  const title = /^# (.+)$/m.exec(text)?.[1];
  if (!title) errors.push('titre « # … » manquant');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '')) errors.push('date AAAA-MM-JJ manquante');
  else if (!file.startsWith(`${meta.date}-`)) errors.push('le nom du fichier doit commencer par la date');
  if (!meta.branche) errors.push('branche manquante');
  if (!TYPES.includes(meta.type)) errors.push(`type à choisir parmi : ${TYPES.join(', ')}`);
  for (const section of SECTIONS) {
    const body = new RegExp(`^## ${section}\\n+([\\s\\S]*?)(?=\\n## |(?![\\s\\S]))`, 'm').exec(text)?.[1]?.trim();
    if (!body) errors.push(`section « ## ${section} » manquante ou vide (écrire « Rien. » si besoin)`);
    else if (body.includes(TODO)) errors.push(`section « ## ${section} » encore à compléter`);
  }
  return { file, meta, title, errors };
}

const entries = () =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
        .map(read)
    : [];

/** When each branch was merged into main, to order the entries of a same day. */
function mergeTimes() {
  try {
    return new Map(
      git('log', '--merges', '--first-parent', '--format=%at %s')
        .split('\n')
        .map((line) => [/Merge branch '([^']+)'/.exec(line)?.[1], Number(line.split(' ')[0])]),
    );
  } catch {
    return new Map();
  }
}

async function summary(list) {
  const merged = mergeTimes();
  // Newest first; on a same day, the branch not merged yet comes first, then by merge time.
  const time = (e) => merged.get(e.meta.branche) ?? (e.meta.branche === 'avant-le-journal' ? 0 : Infinity);
  const rows = [...list]
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date) || time(b) - time(a) || b.file.localeCompare(a.file))
    .map((e) => `| ${e.meta.date} | [${e.title}](journal/${e.file}) | ${e.meta.type} | \`${e.meta.branche}\` |`);
  const text = [
    '# Journal des changements',
    '',
    'Chaque changement fusionné dans `main` a sa fiche dans [journal/](journal/) : pourquoi, ce qui a été',
    'ajouté, modifié et supprimé, les tests, les fichiers et les commits. Ce sommaire est régénéré par',
    '`npm run journal -- index` ; `npm run check` vérifie qu’il est à jour et qu’aucune fusion ne manque.',
    '',
    '| Date | Changement | Type | Branche |',
    '| ---- | ---------- | ---- | ------- |',
    ...rows,
    '',
  ].join('\n');
  const options = (await prettier.resolveConfig(summaryFile)) ?? {};
  return prettier.format(text, { ...options, filepath: summaryFile });
}

/** Branches merged into main since START, or null in a shallow clone (CI) where history is missing. */
function mergedBranches() {
  try {
    git('cat-file', '-e', `${START}^{commit}`);
  } catch {
    return null;
  }
  return git('log', '--merges', '--first-parent', '--format=%s', `${START}..HEAD`)
    .split('\n')
    .map((subject) => /^Merge branch '([^']+)'/.exec(subject)?.[1])
    .filter(Boolean);
}

const STATUS = { A: 'ajouté', M: 'modifié', D: 'supprimé', R: 'renommé', C: 'copié' };

function draft({ branch, base, tip, date }) {
  const commits = git('log', '--reverse', '--format=- `%h` %s', `${base}..${tip}`);
  const files = git('diff', '--name-status', `${base}..${tip}`)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, ...paths] = line.split('\t');
      return `- ${STATUS[status[0]] ?? status} : \`${paths.join('` → `')}\``;
    })
    .join('\n');
  return `---
date: ${date}
branche: ${branch}
type: ${TODO}
version: non publiée
---

# ${TODO}

## Pourquoi

${TODO}

## Ajouté

${TODO}

## Modifié

${TODO}

## Supprimé

${TODO}

## Tests

${TODO}

## Fichiers

${files || 'Rien.'}

## Commits

${commits || 'Rien.'}
`;
}

const [command, ...args] = process.argv.slice(2);

if (command === 'new') {
  const mergeAt = args[args.indexOf('--merge') + 1];
  let branch, base, tip, date;
  if (args.includes('--merge')) {
    branch = /Merge branch '([^']+)'/.exec(git('log', '-1', '--format=%s', mergeAt))?.[1];
    if (!branch) fail(`${mergeAt} n'est pas une fusion de branche.`);
    base = git('rev-parse', `${mergeAt}^1`);
    tip = git('rev-parse', `${mergeAt}^2`);
    date = git('log', '-1', '--format=%ad', '--date=short', mergeAt);
  } else {
    branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    if (branch === 'main') fail('Lance-le depuis la branche du changement, avant de la fusionner.');
    base = git('merge-base', 'main', 'HEAD');
    tip = 'HEAD';
    date = new Date().toLocaleDateString('sv-SE');
  }
  const file = path.join(dir, `${date}-${branch.replace(/[^\p{L}\p{N}]+/gu, '-')}.md`);
  if (existsSync(file)) fail(`${file} existe déjà.`);
  writeFileSync(file, draft({ branch, base, tip, date }));
  console.log(`Brouillon créé : ${file}\nComplète les sections « ${TODO} », puis npm run journal -- index.`);
} else if (command === 'index') {
  writeFileSync(summaryFile, await summary(entries()));
  console.log(`${summaryFile} régénéré.`);
} else {
  const list = entries();
  const problems = list.flatMap((e) => e.errors.map((error) => `${e.file} : ${error}`));
  const documented = new Set(list.map((e) => e.meta.branche));
  const merged = mergedBranches();
  for (const branch of merged ?? []) {
    if (!documented.has(branch)) problems.push(`la branche fusionnée « ${branch} » n'a pas de fiche (npm run journal -- new)`);
  }
  if (!existsSync(summaryFile) || readFileSync(summaryFile, 'utf8') !== (await summary(list))) {
    problems.push(`${summaryFile} n'est pas à jour (npm run journal -- index)`);
  }
  if (problems.length) fail(`Journal :\n- ${problems.join('\n- ')}`);
  console.log(`Journal : ${list.length} fiches, correct${merged ? '' : ' (historique git absent : fusions non vérifiées)'}.`);
}
