// Screenshots the web app for visual checks: node scripts/shoot.mjs <out-dir> [steps...]
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { serveWeb } from './lib/serve-web.mjs';

const out = process.argv[2] ?? path.join(tmpdir(), 'cobblestone-shots');
await mkdir(out, { recursive: true });
const web = await serveWeb();
const base = web.url;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
});
const errors = [];

async function session(name, { width = 1440, height = 900, paper = 'light', lang = 'fr-FR' } = {}, steps = async () => {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: paper,
    locale: lang,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name} console: ${m.text()}`));
  await page.goto(base);
  await page.waitForTimeout(800);
  await steps(page, async (label) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${out}/${name}-${label}.png` });
  });
  await context.close();
}

const demo = async (page) => {
  await page.getByRole('button', { name: /Essayer la démo|Try the demo/ }).click();
  await page.waitForTimeout(900);
};

await session('launcher', {}, async (page, shot) => shot('day'));
await session('launcher', { paper: 'dark' }, async (page, shot) => shot('night'));
await session('demo', {}, async (page, shot) => {
  await demo(page);
  await shot('welcome');
  await page.locator('.cm-content').click({ position: { x: 40, y: 200 } });
  await shot('editing');
  await page.getByRole('button', { name: 'Lire' }).first().click();
  await shot('reading');
  await page.locator('.reading-view a.internal-link').first().hover();
  await page.waitForTimeout(700);
  await shot('preview');
  await page.mouse.move(10, 10);
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+k');
  await page.keyboard.type('mise');
  await shot('finder');
  await page.keyboard.press('Enter');
  await shot('formatting');
});
await session('demo-night', { paper: 'dark' }, async (page, shot) => {
  await demo(page);
  await shot('welcome');
  await page
    .getByRole('button', { name: /Graphe/ })
    .first()
    .click();
  await page.waitForTimeout(1500);
  await shot('graph');
});
await session('mobile', { width: 390, height: 844 }, async (page, shot) => {
  await shot('launcher');
  await demo(page);
  await shot('note');
});

await browser.close();
await web.stop();
console.log(errors.length ? errors.join('\n') : 'no page errors');
process.exit(0);
