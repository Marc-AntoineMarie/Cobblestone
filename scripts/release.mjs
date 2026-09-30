// Publie une version : `npm run release 0.2.0`. Guide complet : contribution/VERSIONS.md.
// Vérifie l'arbre, les tests et la recette automatique, met la version à jour dans tous les
// package.json et dans les fiches du journal pas encore publiées, complète le CHANGELOG à partir des
// commits, crée le commit `chore(release): vX.Y.Z` et le tag annoté, puis les pousse. Le tag
// déclenche .github/workflows/release.yml, qui construit et publie la release.
// Options : `--no-push` prépare tout sans pousser ; `--sans-recette` saute la recette automatique
// (à éviter : seulement pour un correctif urgent, la recette passée juste avant à la main).
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const args = process.argv.slice(2);
const push = !args.includes('--no-push');
const recette = !args.includes('--sans-recette');
const version = args.find((a) => !a.startsWith('--'))?.replace(/^v/, '');
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(version))
  fail('Usage : npm run release <version>   (ex. npm run release 0.2.0)');
const tag = `v${version}`;
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();

if (git('status', '--porcelain')) fail('Des modifications ne sont pas commitées : commite-les avant de publier.');
if (git('branch', '--show-current') !== 'main') fail('Les releases partent de la branche main.');
if (git('tag', '--list', tag)) fail(`Le tag ${tag} existe déjà.`);

console.log('Vérifications (formatage, types, tests)…');
execSync('npm run check', { stdio: 'inherit' });
if (recette) {
  console.log('Recette automatique sur le bureau et le web (une vingtaine de minutes)…');
  execSync('npm run e2e', { stdio: 'inherit' });
} else {
  console.warn('Recette automatique sautée (--sans-recette).');
}

// Versions : racine et tous les paquets du workspace.
const manifests = ['package.json'];
for (const dir of ['packages', 'apps']) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name, 'package.json');
    if (existsSync(file)) manifests.push(file);
  }
}
for (const file of manifests) {
  const text = readFileSync(file, 'utf8');
  const next = text.replace(/("version":\s*")[^"]+"/, `$1${version}"`);
  if (next === text && !text.includes(`"version": "${version}"`)) fail(`Version introuvable dans ${file}`);
  writeFileSync(file, next);
}
execSync('npm install --package-lock-only --ignore-scripts --no-audit --no-fund', { stdio: 'inherit' });

// Journal : les fiches pas encore publiées le sont dans cette version.
const journal = path.join('contribution', 'journal');
const stamped = [];
for (const name of readdirSync(journal)) {
  const file = path.join(journal, name);
  const text = readFileSync(file, 'utf8');
  if (!name.startsWith('_') && /^version: non publiée$/m.test(text)) {
    writeFileSync(file, text.replace(/^version: non publiée$/m, `version: ${version}`));
    stamped.push(file);
  }
}

// CHANGELOG : commits depuis la version précédente, classés par type.
const previous = (() => {
  try {
    return git('describe', '--tags', '--abbrev=0', '--match', 'v*');
  } catch {
    return null;
  }
})();
const log = git('log', previous ? `${previous}..HEAD` : 'HEAD', '--format=%h%x09%s%x09%b%x1e');
const sections = {
  breaking: 'Changements cassants',
  feat: 'Nouveautés',
  fix: 'Corrections',
  perf: 'Performances',
  docs: 'Documentation',
  other: 'Maintenance',
};
const groups = Object.fromEntries(Object.keys(sections).map((k) => [k, []]));
for (const entry of log
  .split('\x1e')
  .map((e) => e.trim())
  .filter(Boolean)) {
  const [hash, subject, body = ''] = entry.split('\t');
  const m = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/.exec(subject);
  if (!m) {
    groups.other.push(`- ${subject} (${hash})`);
    continue;
  }
  const [, type, scope, bang, message] = m;
  if (type === 'chore' && scope === 'release') continue;
  const line = `- ${scope ? `**${scope}** : ` : ''}${message} (${hash})`;
  if (bang || /BREAKING CHANGE/.test(body)) groups.breaking.push(line);
  else if (groups[type]) groups[type].push(line);
  else groups.other.push(line);
}
const date = new Date().toISOString().slice(0, 10);
let notes = `## [${version}] - ${date}\n`;
for (const [key, title] of Object.entries(sections)) {
  if (groups[key].length) notes += `\n### ${title}\n\n${groups[key].join('\n')}\n`;
}
const changelogPath = 'CHANGELOG.md';
const changelog = readFileSync(changelogPath, 'utf8');
const marker = '<!-- versions -->';
if (!changelog.includes(marker)) fail(`Repère ${marker} absent de ${changelogPath}`);
writeFileSync(changelogPath, changelog.replace(marker, `${marker}\n\n${notes}`));

git('add', ...manifests, 'package-lock.json', changelogPath, ...stamped);
git('commit', '-m', `chore(release): ${tag}`);
git('tag', '-a', tag, '-m', `Cobblestone ${tag}`);
console.log(`\nCommit et tag ${tag} créés.`);

if (push) {
  execFileSync('git', ['push', '--atomic', 'origin', 'main', tag], { stdio: 'inherit' });
  console.log(`${tag} poussé : la release se construit dans l'onglet Actions du dépôt GitHub.`);
} else {
  console.log(`Rien n'a été poussé. Pour publier : git push --atomic origin main ${tag}`);
}
