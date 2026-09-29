// Checks docs/RECETTE.md against the automated checklist (tests/recette/).
//   node scripts/recette.mjs          format of each line, every check covered on each of its platforms, statuses up to date
//   node scripts/recette.mjs sync     rewrites the status of each line (auto, manuel, à automatiser) from the tests
//   node scripts/recette.mjs --json   prints the sections and checks as JSON
import { execFileSync } from 'node:child_process';
import { parseRecette, statusLabel, withStatuses, writeRecette } from './lib/recette-md.mjs';

const parsed = parseRecette();
const problems = [...parsed.problems];

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(parsed.sections));
  process.exit(0);
}

/** Every test of the suite, without running it: [{ id, project, kind }]. */
function listTests() {
  const output = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const report = JSON.parse(output);
  if (report.errors?.length) {
    problems.push(...report.errors.map((e) => `tests : ${e.message?.split('\n')[0]}`));
  }
  const tests = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const kind = test.annotations.find((a) => a.type === 'recette')?.description ?? 'auto';
        tests.push({ id: spec.title.split(' · ')[0], project: test.projectName, kind, file: spec.file });
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return tests;
}

const listed = listTests();
/** id → { bureau: 'auto', web: 'manuel' } */
const byId = new Map();
for (const t of listed) {
  const check = parsed.tests.get(t.id);
  if (!check) {
    problems.push(`${t.file} : le test ${t.id} n'existe pas dans la recette`);
    continue;
  }
  const states = byId.get(t.id) ?? {};
  if (states[t.project]) problems.push(`${t.id} (${t.project}) : décrit deux fois dans les tests`);
  states[t.project] = t.kind;
  byId.set(t.id, states);
}

const missing = [];
for (const check of parsed.tests.values()) {
  for (const platform of check.where) if (!byId.get(check.id)?.[platform]) missing.push(`${check.id} (${platform})`);
}
if (missing.length) {
  problems.push(
    `${missing.length} vérifications sans test : ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? '…' : ''}\n` +
      '  Chaque ligne de la recette a un test dans tests/recette/ : recette(id, …), recette.manuel(id, raison), recette.ci(id, quoi) ou recette.aFaire(id).',
  );
}

const statusOf = (check) => statusLabel(check, byId.get(check.id) ?? {});
const stale = [...parsed.tests.values()].filter((check) => check.status !== statusOf(check));

if (process.argv.includes('sync')) {
  writeRecette(withStatuses(parsed, statusOf));
  console.log(`Recette : statut de ${stale.length} lignes mis à jour.`);
} else if (stale.length) {
  problems.push(
    `statut de ${stale.length} lignes à mettre à jour (${stale
      .slice(0, 6)
      .map((c) => c.id)
      .join(', ')}…) : npm run recette -- sync`,
  );
}

if (problems.length) {
  console.error(`Recette :\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

const count = { auto: 0, ci: 0, manuel: 0, 'à automatiser': 0 };
for (const states of byId.values()) for (const kind of Object.values(states)) count[kind]++;
console.log(
  `Recette : ${parsed.tests.size} vérifications, ${count.auto} tests automatiques, ${count.ci} par la CI, ${count.manuel} manuels, ${count['à automatiser']} à automatiser.`,
);
