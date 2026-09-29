// End-to-end check of the desktop app on a real folder that looks like an Obsidian vault.
import { _electron as electron } from 'playwright-core';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rename, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const out = process.argv[2] ?? path.join(tmpdir(), 'cobblestone-shots');
await mkdir(out, { recursive: true });
const root = await mkdtemp(path.join(tmpdir(), 'cobblestone-e2e-'));
const vault = path.join(root, 'My Vault');
const userData = path.join(root, 'userdata');
await mkdir(path.join(vault, '.obsidian'), { recursive: true });
await mkdir(path.join(vault, 'Projects'), { recursive: true });
await mkdir(userData, { recursive: true });
await writeFile(
  path.join(vault, '.obsidian/app.json'),
  JSON.stringify({ attachmentFolderPath: 'assets', strictLineBreaks: true }),
);
await writeFile(
  path.join(vault, '.obsidian/bookmarks.json'),
  JSON.stringify({ items: [{ type: 'file', ctime: 1, path: 'Home.md' }] }),
);
await writeFile(path.join(vault, 'Home.md'), '# Home\n\nSee [[Projects/Plan]] and [[Missing]].\n');
await writeFile(path.join(vault, 'Ideas.md'), 'The plan needs work.\n');
const board = JSON.stringify(
  {
    nodes: [
      { id: '1a2b3c4d5e6f7a8b', type: 'text', text: 'Hello', x: 0, y: 0, width: 250, height: 60, color: '4' },
      { id: '9a8b7c6d5e4f3a2b', type: 'file', file: 'Projects/Plan.md', x: 300, y: 0, width: 400, height: 300 },
    ],
    edges: [{ id: 'e1', fromNode: '1a2b3c4d5e6f7a8b', fromSide: 'right', toNode: '9a8b7c6d5e4f3a2b', toSide: 'left' }],
  },
  null,
  '\t',
);
await writeFile(path.join(vault, 'Board.canvas'), board);
await writeFile(path.join(vault, 'Projects/Plan.md'), '---\nstatus: draft\n---\nBack to [[Home]].\n');
await writeFile(
  path.join(userData, 'vaults.json'),
  JSON.stringify([{ id: 'v1', name: 'My Vault', kind: 'folder', location: vault, lastOpened: Date.now() }]),
);
await writeFile(path.join(userData, 'storage.json'), JSON.stringify({ lastVault: 'v1' }));

const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE'));
env.COBBLESTONE_USER_DATA = userData;
env.LANG = 'en_US.UTF-8';
// On CI machines Chromium's sandbox is often unavailable (no user namespaces): tests run without it there.
const args = [path.resolve('apps/desktop'), ...(process.env.CI ? ['--no-sandbox'] : [])];
const errors = [];
async function launch() {
  let app;
  try {
    app = await electron.launch({ executablePath: path.resolve('node_modules/electron/dist/electron'), args, env });
  } catch (error) {
    console.error('Electron did not start:', error);
    process.exit(1);
  }
  const page = await app.firstWindow();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.waitForTimeout(1500);
  return { app, page };
}
let { app, page } = await launch();

/** Saves are debounced and a cold start is slow: wait for the file rather than a fixed time. */
async function fileSoon(file, test, timeout = 4000) {
  for (const end = Date.now() + timeout; Date.now() < end; await new Promise((r) => setTimeout(r, 100))) {
    if (test(await readFile(file, 'utf8').catch(() => ''))) return true;
  }
  return false;
}

const check = (label, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) process.exitCode = 1;
};
process.on('unhandledRejection', async (error) => {
  console.error(error);
  await page.screenshot({ path: `${out}/e2e-desktop-failure.png` }).catch(() => {});
  process.exit(1);
});

await page.locator('.tree-row', { hasText: 'Home' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/e2e-home.png`, timeout: 5000 }).catch(() => undefined);
check('opens the vault and shows Home', (await page.locator('.note-title').inputValue()) === 'Home');

// Type in the editor and wait for the save.
await page.locator('.cm-content').click();
await page.keyboard.press('Control+End');
await page.keyboard.type('\nWritten from Cobblestone.');
check(
  'edits are saved to disk',
  await fileSoon(path.join(vault, 'Home.md'), (text) => text.includes('Written from Cobblestone.')),
);

// Rename through the title: links in other notes follow.
await page.locator('.note-title').fill('Start');
await page.keyboard.press('Enter');
await page.waitForTimeout(900);
const plan = await readFile(path.join(vault, 'Projects/Plan.md'), 'utf8');
check('renaming updates links on disk', plan.includes('[[Start]]'));
check(
  'bookmarks imported from Obsidian follow the rename',
  (await page.locator('.rail-bookmarks').innerText()).includes('Start'),
);

// External change: another program edits a file.
await writeFile(path.join(vault, 'Projects/Plan.md'), plan + '\nEdited outside.\n');
await page.waitForTimeout(1200);
await page.locator('.tree-row', { hasText: 'Projects' }).click();
await page.locator('.tree-row', { hasText: 'Plan' }).click();
await page.waitForTimeout(600);
check('picks up external edits', (await page.locator('.cm-content').innerText()).includes('Edited outside.'));

// Unlinked mentions: "plan" in Ideas.md becomes a link to Plan.
await page.locator('#m-unlinked').click();
await page.locator('.mention-link').first().click();
await page.waitForTimeout(600);
check(
  'links an unlinked mention on disk',
  (await readFile(path.join(vault, 'Ideas.md'), 'utf8')).includes('The [[Plan|plan]] needs work.'),
);
await page.screenshot({ path: `${out}/e2e-plan.png`, timeout: 5000 }).catch(() => undefined);

// A canvas opened and left alone is not rewritten.
await page.locator('.tree-row', { hasText: 'Board' }).click();
await page.waitForTimeout(800);
check('shows an Obsidian canvas', (await page.locator('.canvas-node').count()) === 2);
await page.locator('.tree-row', { hasText: 'Ideas' }).click();
await page.waitForTimeout(500);
check('leaves an untouched canvas byte for byte', (await readFile(path.join(vault, 'Board.canvas'), 'utf8')) === board);

// Obsidian settings were imported into .cobblestone and .obsidian was left alone.
const own = JSON.parse(await readFile(path.join(vault, '.cobblestone/app.json'), 'utf8'));
check('imports Obsidian settings', own.attachmentLocation === 'assets' && own.lineBreaks === false);
check(
  'leaves .obsidian untouched',
  (await readFile(path.join(vault, '.obsidian/app.json'), 'utf8')).includes('strictLineBreaks'),
);

// Notes and folders can be shown in the system's file manager (not clicked: it would open a window).
await page.locator('.tree-row', { hasText: 'Projects' }).click({ button: 'right' });
check(
  'offers to show a folder in the file manager',
  (await page.locator('.menu').innerText()).includes('Show in the file manager'),
);
await page.keyboard.press('Escape');
await page.locator('.vault-switch').click();
check('offers to open the vault folder', (await page.locator('.menu').innerText()).includes('Open the vault folder'));
await page.keyboard.press('Escape');

// The vault's folder is renamed in another app while it is open: the app offers to follow it.
const renamed = path.join(root, 'Renamed Vault');
await rename(vault, renamed);
await page.locator('.lost-vault').waitFor({ timeout: 8000 });
await page.screenshot({ path: `${out}/e2e-lost-open.png`, timeout: 5000 }).catch(() => undefined);
await page.getByRole('button', { name: 'Follow the change' }).click();
await page.locator('.lost-vault').waitFor({ state: 'detached', timeout: 5000 });
await page.locator('.tree-row', { hasText: 'Ideas' }).click();
await page.locator('.cm-content').click();
await page.keyboard.press('Control+End');
await page.keyboard.type('\nAfter the rename.');
check('follows a vault renamed while open', (await page.locator('.vault-name').innerText()) === 'Renamed Vault');
check(
  'saves at the new place and recreates nothing at the old one',
  (await fileSoon(path.join(renamed, 'Ideas.md'), (text) => text.includes('After the rename.'))) && !existsSync(vault),
);

// Moved while the app is closed: the next start finds it and asks.
await app.close();
const moved = path.join(root, 'Archive', 'Notes');
await mkdir(path.dirname(moved));
await rename(renamed, moved);
({ app, page } = await launch());
await page.locator('.lost-vault h2', { hasText: 'is now called' }).waitFor({ timeout: 8000 });
await page.screenshot({ path: `${out}/e2e-lost-launcher.png`, timeout: 5000 }).catch(() => undefined);
await page.getByRole('button', { name: 'Follow and open' }).click();
await page.locator('.vault-name').waitFor({ timeout: 5000 });
check('finds a vault moved while the app was closed', (await page.locator('.vault-name').innerText()) === 'Notes');
const list = JSON.parse(await readFile(path.join(userData, 'vaults.json'), 'utf8'));
check('keeps one entry, at the new place', list.length === 1 && list[0].id === 'v1' && list[0].location === moved);

await app.close();
await rm(root, { recursive: true, force: true });
console.log(errors.length ? 'page errors:\n' + errors.join('\n') : 'no page errors');
