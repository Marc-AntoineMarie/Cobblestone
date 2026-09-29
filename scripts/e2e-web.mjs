// End-to-end check of the web app with a vault stored in the browser (OPFS).
// Builds the web app and serves it with Vite's preview server unless URL is set (the dev server can
// reload the page mid-test while it optimises dependencies). Screenshots go to the directory given.
import { chromium } from 'playwright-core';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, preview } from 'vite';

const out = process.argv[2] ?? path.join(tmpdir(), 'cobblestone-shots');
await mkdir(out, { recursive: true });
let server = null;
if (!process.env.URL) {
  const config = { configFile: path.resolve('apps/web/vite.config.ts'), root: path.resolve('apps/web'), logLevel: 'warn' };
  await build(config);
  server = await preview({ ...config, preview: { port: 5199, strictPort: false } });
}
const base = process.env.URL ?? server.resolvedUrls.local[0];
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

await context.close();
await rm(profile, { recursive: true, force: true });
await server?.close();
console.log(errors.length ? 'page errors:\n' + errors.join('\n') : 'no page errors');
process.exit(process.exitCode ?? 0);
