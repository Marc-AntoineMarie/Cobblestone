// Reads and writes docs/RECETTE.md, the acceptance checklist. One line per check:
//   - **2.26** · Bureau · auto · action → expected
// The status after the platform (auto, ci, manuel, à automatiser, or one per platform:
// "auto bureau, manuel web") is written by `npm run recette -- sync` from the test suite.
import { readFileSync, writeFileSync } from 'node:fs';

export const RECETTE_FILE = new URL('../../docs/RECETTE.md', import.meta.url);

/** Where each check applies, as test project names. */
export const PLACES = { Bureau: ['bureau'], Web: ['web'], 'Les deux': ['bureau', 'web'] };
export const STATUSES = ['auto', 'ci', 'manuel', 'à automatiser'];

const PART = `(?:${STATUSES.join('|')})(?: bureau| web)?`;
const LINE = new RegExp(`^- \\*\\*(\\d+)\\.(\\d+)\\*\\* · (Bureau|Web|Les deux) · (?:(${PART}(?:, ${PART})*) · )?(.+)$`);

/**
 * @typedef {{ id: string, line: number, place: 'Bureau' | 'Web' | 'Les deux', where: string[], status: string | null, action: string, expected: string }} Check
 * @typedef {{ id: string, title: string, tests: Check[] }} Section
 */

/**
 * Parses the checklist; `problems` lists every line that breaks the format.
 * @returns {{ text: string, sections: Section[], tests: Map<string, Check>, problems: string[] }}
 */
export function parseRecette(text = readFileSync(RECETTE_FILE, 'utf8')) {
  /** @type {Section[]} */
  const sections = [];
  /** @type {string[]} */
  const problems = [];
  /** @type {Map<string, Check>} */
  const tests = new Map();
  for (const [n, line] of text.split('\n').entries()) {
    const heading = /^## (\d+)\. (.+)$/.exec(line);
    if (heading) {
      sections.push({ id: heading[1], title: heading[2], tests: [] });
      continue;
    }
    if (!line.startsWith('- **')) continue;
    const m = LINE.exec(line);
    const section = sections[sections.length - 1];
    if (!m || !section) {
      problems.push(`ligne ${n + 1} : format non reconnu`);
      continue;
    }
    const [, sectionId, index, place, status, rest] = m;
    const id = `${sectionId}.${index}`;
    const parts = rest.split(' → ');
    if (parts.length !== 2) problems.push(`${id} : ${parts.length - 1} flèches au lieu d'une`);
    if (sectionId !== section.id) problems.push(`${id} : hors de sa section ${section.id}`);
    if (Number(index) !== section.tests.length + 1)
      problems.push(`${id} : numéro attendu ${section.id}.${section.tests.length + 1}`);
    if (tests.has(id)) problems.push(`${id} : en double`);
    const test = /** @type {Check} */ ({
      id,
      line: n,
      place,
      where: PLACES[place],
      status: status ?? null,
      action: parts[0],
      expected: parts.slice(1).join(' → '),
    });
    tests.set(id, test);
    section.tests.push(test);
  }
  return { text, sections, tests, problems };
}

/**
 * The status to print for a check, from the state of each platform
 * ({ bureau: 'auto', web: 'manuel' }): one word when they agree.
 */
export function statusLabel(test, byPlatform) {
  const values = test.where.map((p) => byPlatform[p] ?? 'à automatiser');
  if (values.every((v) => v === values[0])) return values[0];
  return test.where.map((p, i) => `${values[i]} ${p}`).join(', ');
}

/** Rewrites the status of each line; returns the new text. */
export function withStatuses(parsed, statusOf) {
  const lines = parsed.text.split('\n');
  for (const test of parsed.tests.values()) {
    const status = statusOf(test);
    lines[test.line] = `- **${test.id}** · ${test.place} · ${status} · ${test.action} → ${test.expected}`;
  }
  return lines.join('\n');
}

export function writeRecette(text) {
  writeFileSync(RECETTE_FILE, text);
}
