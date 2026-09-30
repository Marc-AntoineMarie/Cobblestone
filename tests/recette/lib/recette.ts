import { test as base, chromium, expect, type Browser, type TestInfo } from '@playwright/test';
import { parseRecette } from '../../../scripts/lib/recette-md.mjs';
import { Cobble, type Platform } from './cobble';
import { Ui } from './ui';

/*
 * Every check of docs/RECETTE.md is a test named after it:
 *   recette('2.14', async ({ app, ui }) => { … })
 * The test runs on each platform its line names (Bureau, Web, Les deux).
 * A check no machine can do is declared with recette.manuel(id, why), one the
 * continuous integration does with recette.ci(id, what), one not automated yet
 * with recette.aFaire(id). `npm run recette` refuses a line of
 * the checklist that has none of the three.
 */

const checklist = parseRecette().tests;

interface Fixtures {
  app: Cobble;
  ui: Ui;
}
interface WorkerFixtures {
  platform: Platform;
  chrome: { get(): Promise<Browser> } | null;
}

/** --disable-dev-shm-usage: the small shared memory of CI machines makes Chrome crash. */
const CHROME_ARGS = ['--no-sandbox', '--disable-dev-shm-usage'];

export const test = base.extend<Fixtures, WorkerFixtures>({
  platform: ['web', { option: true, scope: 'worker' }],
  chrome: [
    async ({ platform }, use) => {
      if (platform !== 'web') return use(null);
      const launch = () =>
        chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: CHROME_ARGS });
      let browser = await launch();
      // A Chrome that crashed is started again for the next test, instead of failing every test after it.
      await use({ get: async () => (browser.isConnected() ? browser : (browser = await launch())) });
      await browser.close().catch(() => undefined);
    },
    { scope: 'worker' },
  ],
  app: async ({ platform, chrome }, use, testInfo) => {
    const app = new Cobble(platform, chrome ? await chrome.get() : null);
    await use(app);
    if (testInfo.status !== testInfo.expectedStatus && app.page) {
      await testInfo
        .attach('écran', { body: await app.page.screenshot().catch(() => Buffer.from('')), contentType: 'image/png' })
        .catch(() => undefined);
    }
    const errors = [...app.errors];
    await app.close();
    expect(errors, 'erreurs non rattrapées dans la page').toEqual([]);
  },
  ui: async ({ app }, use) => {
    await use(new Ui(app));
  },
});

export { expect };

type Body = (fixtures: { app: Cobble; ui: Ui; platform: Platform }, testInfo: TestInfo) => Promise<void>;
type Only = { seulement?: Platform[] };

function line(id: string) {
  const entry = checklist.get(id);
  if (!entry) throw new Error(`Recette : le test ${id} n'existe pas dans docs/RECETTE.md`);
  return entry;
}

/** Tags pick the projects: @bureau, @web. */
function title(id: string, platforms: string[]) {
  const entry = line(id);
  return `${id} · ${entry.action} → ${entry.expected} ${platforms.map((p) => `@${p}`).join(' ')}`;
}

function platformsOf(id: string, only?: Platform[]) {
  const where = line(id).where as Platform[];
  if (!only) return where;
  const bad = only.filter((p) => !where.includes(p));
  if (bad.length) throw new Error(`Recette ${id} : ${bad.join(', ')} ne fait pas partie de « ${line(id).place} »`);
  return only;
}

/** An automated check. */
export function recette(id: string, body: Body, options: Only = {}) {
  const platforms = platformsOf(id, options.seulement);
  test(
    title(id, platforms),
    { annotation: { type: 'recette', description: 'auto' } },
    async ({ app, ui, platform }, testInfo) => {
      await body({ app, ui, platform }, testInfo);
    },
  );
}

/** A check that needs a person (installing a package, looking at the dock…), with the reason. */
recette.manuel = (id: string, why: string, options: Only = {}) => {
  const platforms = platformsOf(id, options.seulement);
  test(
    title(id, platforms),
    {
      annotation: [
        { type: 'recette', description: 'manuel' },
        { type: 'manuel', description: why },
      ],
    },
    () => {
      test.skip(true, `manuel : ${why}`);
    },
  );
};

/** A check the continuous integration does on every push (install, check, e2e). */
recette.ci = (id: string, what: string, options: Only = {}) => {
  const platforms = platformsOf(id, options.seulement);
  test(
    title(id, platforms),
    {
      annotation: [
        { type: 'recette', description: 'ci' },
        { type: 'ci', description: what },
      ],
    },
    () => {
      test.skip(true, `intégration continue : ${what}`);
    },
  );
};

/** A check not automated yet: listed as « à automatiser » in the checklist. */
recette.aFaire = (id: string, options: Only = {}) => {
  const platforms = platformsOf(id, options.seulement);
  test(title(id, platforms), { annotation: { type: 'recette', description: 'à automatiser' } }, () => {
    test.skip(true, 'à automatiser');
  });
};
