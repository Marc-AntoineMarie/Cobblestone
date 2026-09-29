// End-to-end check of the web app with a vault stored in the browser (OPFS).
import { chromium } from 'playwright-core';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { serveWeb } from './lib/serve-web.mjs';

const out = process.argv[2] ?? path.join(tmpdir(), 'cobblestone-shots');
await mkdir(out, { recursive: true });
const web = await serveWeb();
const base = web.url;
const profile = await mkdtemp(path.join(tmpdir(), 'cobblestone-web-'));
const context = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  viewport: { width: 1280, height: 800 },
  locale: 'en-US',
  args: ['--no-sandbox'],
});
const errors = [];
const page = context.pages()[0] ?? (await context.newPage());
page.on('pageerror', (e) => errors.push(e.message));
const check = (label, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) process.exitCode = 1;
};

await page.goto(base);
await page.getByRole('button', { name: 'New vault' }).click();
await page.getByLabel('Vault name').fill('Browser notes');
await page.getByRole('button', { name: 'Create', exact: true }).click();
await page.waitForTimeout(800);
check('creates a browser vault', (await page.locator('.vault-name').innerText()) === 'Browser notes');

await page.keyboard.press('Control+n');
await page.waitForTimeout(400);
await page.keyboard.type('Groceries');
await page.keyboard.press('Enter');
await page.keyboard.type('- [ ] eggs\n[[Recipes]] #shopping');
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/web-e2e-note.png`, timeout: 5000 }).catch(() => undefined);
check('titles the note from the title field', (await page.locator('.tab.is-active').innerText()).includes('Groceries'));

await page.reload();
await page.waitForTimeout(1500);
check('reopens the last vault after a reload', (await page.locator('.vault-name').innerText()) === 'Browser notes');
const text = await page
  .locator('.cm-content')
  .innerText()
  .catch(() => '');
check('keeps the note content', text.includes('eggs') && text.includes('Recipes'));
check('lists the tag', (await page.locator('.tag-list').innerText()).includes('shopping'));

// Click the unresolved link: it creates the note.
await page.locator('.cm-wikilink', { hasText: 'Recipes' }).click();
await page.waitForTimeout(600);
check('following a missing link creates the note', (await page.locator('.note-title').inputValue()) === 'Recipes');
await page.screenshot({ path: `${out}/web-e2e-created.png`, timeout: 5000 }).catch(() => undefined);

// Templates: a note in Templates/ is inserted with its variables filled.
await page.keyboard.press('Control+k');
await page.keyboard.type('Templates/Meeting');
await page.keyboard.press('Shift+Enter');
await page.waitForTimeout(500);
await page.locator('.note-title').press('Enter');
await page.keyboard.type('## {{title}} on {{date:YYYY}}');
await page.waitForTimeout(700);
// Ctrl+N belongs to the browser: the web app uses Alt+N.
await page.keyboard.press('Alt+n');
await page.waitForTimeout(400);
await page.keyboard.type('Standup');
await page.keyboard.press('Enter');
// No pause: the template must reach the note even while its rename is still in flight.
await page.keyboard.press('Alt+t');
await page.waitForTimeout(300);
await page.keyboard.type('Meet');
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
check('a new note starts with its title selected', (await page.locator('.note-title').inputValue()) === 'Standup');
check(
  'inserts a template with its variables',
  (await page.locator('.cm-content').innerText()).includes(`Standup on ${new Date().getFullYear()}`),
);

await context.close();
await rm(profile, { recursive: true, force: true });
await web.stop();
console.log(errors.length ? 'page errors:\n' + errors.join('\n') : 'no page errors');
process.exit(process.exitCode ?? 0);
