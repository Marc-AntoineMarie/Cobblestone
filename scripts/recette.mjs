// Reads docs/RECETTE.md, checks its format and prints it as JSON (used to build the test page).
// `node scripts/recette.mjs` checks only; `--json` prints the sections and tests.
import { readFileSync } from 'node:fs';

const text = readFileSync(new URL('../docs/RECETTE.md', import.meta.url), 'utf8');
const sections = [];
const problems = [];
const seen = new Set();
const PLACES = { Bureau: ['desktop'], Web: ['web'], 'Les deux': ['desktop', 'web'] };

for (const [n, line] of text.split('\n').entries()) {
  const heading = /^## (\d+)\. (.+)$/.exec(line);
  if (heading) {
    sections.push({ id: heading[1], title: heading[2], tests: [] });
    continue;
  }
  if (!line.startsWith('- **')) continue;
  const m = /^- \*\*(\d+)\.(\d+)\*\* · (Bureau|Web|Les deux) · (.+)$/.exec(line);
  const section = sections[sections.length - 1];
  if (!m || !section) {
    problems.push(`ligne ${n + 1} : format non reconnu`);
    continue;
  }
  const [, sectionId, index, place, rest] = m;
  const id = `${sectionId}.${index}`;
  const parts = rest.split(' → ');
  if (parts.length !== 2) problems.push(`${id} : ${parts.length - 1} flèches au lieu d'une`);
  if (sectionId !== section.id) problems.push(`${id} : hors de sa section ${section.id}`);
  if (Number(index) !== section.tests.length + 1)
    problems.push(`${id} : numéro attendu ${section.id}.${section.tests.length + 1}`);
  if (seen.has(id)) problems.push(`${id} : en double`);
  seen.add(id);
  section.tests.push({ id, where: PLACES[place], action: parts[0], expected: parts.slice(1).join(' → ') });
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
if (process.argv.includes('--json')) console.log(JSON.stringify(sections));
else console.log(`${sections.length} sections, ${seen.size} tests : format correct.`);
