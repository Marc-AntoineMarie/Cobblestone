// End-to-end check of the desktop app on a real folder that looks like an Obsidian vault.
import { _electron as electron } from 'playwright-core';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const out = process.argv[2] ?? 'shots';
const root = await mkdtemp(path.join(tmpdir(), 'cobblestone-e2e-'));
const vault = path.join(root, 'My Vault');
const userData = path.join(root, 'userdata');
await mkdir(path.join(vault, '.obsidian'), { recursive: true });
await mkdir(path.join(vault, 'Projects'), { recursive: true });
await mkdir(userData, { recursive: true });
await writeFile(path.join(vault, '.obsidian/app.json'), JSON.stringify({ attachmentFolderPath: 'assets', strictLineBreaks: true }));
await writeFile(path.join(vault, 'Home.md'), '# Home\n\nSee [[Projects/Plan]] and [[Missing]].\n');
await writeFile(path.join(vault, 'Projects/Plan.md'), '---\nstatus: draft\n---\nBack to [[Home]].\n');
await writeFile(path.join(userData, 'vaults.json'), JSON.stringify([{ id: 'v1', name: 'My Vault', kind: 'folder', location: vault, lastOpened: Date.now() }]));
await writeFile(path.join(userData, 'storage.json'), JSON.stringify({ lastVault: 'v1' }));

const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE'));
env.COBBLESTONE_USER_DATA = userData;
env.LANG = 'en_US.UTF-8';
const app = await electron.launch({ executablePath: path.resolve('node_modules/electron/dist/electron'), args: [path.resolve('apps/desktop')], env });
const errors = [];
const page = await app.firstWindow();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.waitForTimeout(1500);

const check = (label, ok) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) process.exitCode = 1;
};

await page.locator('.tree-row', { hasText: 'Home' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/e2e-home.png` });
check('opens the vault and shows Home', (await page.locator('.note-title').inputValue()) === 'Home');

// Type in the editor and wait for the save.
await page.locator('.cm-content').click();
await page.keyboard.press('Control+End');
await page.keyboard.type('\nWritten from Cobblestone.');
await page.waitForTimeout(900);
const home = await readFile(path.join(vault, 'Home.md'), 'utf8');
check('edits are saved to disk', home.includes('Written from Cobblestone.'));

// Rename through the title: links in other notes follow.
await page.locator('.note-title').fill('Start');
await page.keyboard.press('Enter');
await page.waitForTimeout(900);
const plan = await readFile(path.join(vault, 'Projects/Plan.md'), 'utf8');
check('renaming updates links on disk', plan.includes('[[Start]]'));

// External change: another program edits a file.
await writeFile(path.join(vault, 'Projects/Plan.md'), plan + '\nEdited outside.\n');
await page.waitForTimeout(1200);
await page.locator('.tree-row', { hasText: 'Projects' }).click();
await page.locator('.tree-row', { hasText: 'Plan' }).click();
await page.waitForTimeout(600);
check('picks up external edits', (await page.locator('.cm-content').innerText()).includes('Edited outside.'));
await page.screenshot({ path: `${out}/e2e-plan.png` });

// Obsidian settings were imported into .cobblestone and .obsidian was left alone.
const own = JSON.parse(await readFile(path.join(vault, '.cobblestone/app.json'), 'utf8'));
check('imports Obsidian settings', own.attachmentLocation === 'assets' && own.lineBreaks === false);
check('leaves .obsidian untouched', (await readFile(path.join(vault, '.obsidian/app.json'), 'utf8')).includes('strictLineBreaks'));

await app.close();
await rm(root, { recursive: true, force: true });
console.log(errors.length ? 'page errors:\n' + errors.join('\n') : 'no page errors');
