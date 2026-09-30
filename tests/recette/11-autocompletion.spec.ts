import { expect, recette } from './lib/recette';
import { baseVault, PNG } from './lib/vaults';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 11. Autocomplétion et pièces jointes.

const completions = (ui: Ui) => ui.page.locator('.cm-tooltip-autocomplete li');
const image = (name = 'image.png') => ({ name, type: 'image/png', bytes: PNG });

async function typeIn(app: Cobble, ui: Ui, before = '', extra = {}) {
  await app.start({ vault: baseVault({ 'Essai.md': before, 'Journal/Plan.md': 'un autre plan', ...extra }) });
  await ui.open('Essai');
  await ui.editEnd();
}

recette('11.1', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.page.keyboard.type('[[');
  await expect(ui.editor).toContainText('[[]]');
  await expect(completions(ui).first()).toBeVisible();
});

recette('11.2', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.page.keyboard.type('[[reun');
  const first = completions(ui).first();
  await expect(first).toContainText('Réunion');
  await expect(first.locator('.cm-completionDetail')).toHaveText('Projets');
});

recette('11.3', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.page.keyboard.type('[[reun');
  await expect(completions(ui).first()).toContainText('Réunion');
  await ui.page.waitForTimeout(200); // the editor ignores Enter in the first 75 ms of a list, against slips
  await ui.page.keyboard.press('Enter');
  await ui.page.keyboard.type(' après');
  await expect.poll(() => app.read('Essai.md')).toBe('[[Réunion]] après');
  await ui.page.keyboard.type('\n[[etud');
  await expect(completions(ui).first()).toContainText('Étude');
  await ui.page.waitForTimeout(200);
  await ui.page.keyboard.press('Tab');
  await expect.poll(() => app.read('Essai.md')).toBe('[[Réunion]] après\n[[Étude]]');
});

recette('11.4', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.page.keyboard.type('[[Recherche');
  const alias = completions(ui).filter({ hasText: 'Recherche' }).first();
  await expect(alias).toContainText('Étude');
  await alias.click();
  await expect.poll(() => app.read('Essai.md')).toBe('[[Étude|Recherche]]');
});

recette('11.5', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.page.keyboard.type('[[Plan');
  const journal = completions(ui)
    .filter({ has: ui.page.locator('.cm-completionDetail', { hasText: 'Journal' }) })
    .first();
  await journal.click();
  await expect.poll(() => app.read('Essai.md')).toBe('[[Journal/Plan]]');
});

recette('11.6', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.page.keyboard.type('[[Projets/Plan#');
  await expect(completions(ui)).toContainText(['Plan', 'Étapes', 'Suite']);
});

recette('11.7', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.page.keyboard.type('[[Projets/Plan#^');
  await expect(completions(ui).first()).toContainText('bloc-un');
  await expect(completions(ui).first()).toContainText('Retour à');
});

recette('11.8', async ({ app, ui }) => {
  await typeIn(app, ui, '# Haut\n\n## Milieu\n\n');
  await ui.page.keyboard.type('[[#');
  await expect(completions(ui)).toContainText(['Haut', 'Milieu']);
});

recette('11.9', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.page.keyboard.type('#jo');
  await expect(completions(ui).first()).toContainText('journal');
  await ui.page.keyboard.press('Escape');
  await ui.page.keyboard.type('\n# ');
  await ui.page.waitForTimeout(300);
  await expect(completions(ui)).toHaveCount(0);
});

recette('11.10', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.page.keyboard.type('[[');
  await expect(completions(ui).first()).toBeVisible();
  await ui.page.keyboard.press('Escape');
  await expect(completions(ui)).toHaveCount(0);
});

recette('11.11', async ({ app, ui }) => {
  await typeIn(app, ui);
  const settings = await ui.settings();
  await settings.locator('#set-attach').selectOption('assets');
  await ui.tab('Essai').click();
  await ui.editEnd();
  await ui.pasteFiles([image()]);
  await expect.poll(async () => (await app.list()).filter((p) => /^assets\/Pasted image \d{14}\.png$/.test(p))).toHaveLength(1);
  await expect.poll(() => app.read('Essai.md')).toMatch(/^!\[\[Pasted image \d{14}\.png\]\]$/);
});

recette('11.12', async ({ app, ui }) => {
  await typeIn(app, ui, 'ligne une\nligne deux');
  await ui.dropFiles(ui.lines.first(), [image('photo.png')]);
  await expect.poll(() => app.exists('photo.png')).toBe(true);
  await expect.poll(() => app.read('Essai.md')).toMatch(/!\[\[photo\.png\]\].*\n?ligne deux|ligne une.*!\[\[photo\.png\]\]/s);
});

recette('11.13', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.dropFiles(ui.lines.first(), [
    image('un.png'),
    image('deux.png'),
    { name: 'notes.txt', type: 'text/plain', bytes: Buffer.from('bonjour') },
  ]);
  await expect
    .poll(async () => (await app.list()).filter((p) => ['un.png', 'deux.png', 'notes.txt'].includes(p)))
    .toHaveLength(3);
  await expect.poll(() => app.read('Essai.md')).toBe('![[un.png]]\n![[deux.png]]\n![[notes.txt]]');
});

recette('11.14', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-attach').selectOption('./');
  await ui.open('Réunion');
  await ui.editEnd();
  await ui.pasteFiles([image()]);
  await expect.poll(async () => (await app.list()).filter((p) => p.startsWith('Projets/Pasted image'))).toHaveLength(1);
});

recette('11.15', async ({ app, ui }) => {
  await typeIn(app, ui);
  await ui.pasteFiles([image('capture.png')]);
  await expect.poll(() => app.exists('capture.png')).toBe(true);
  await ui.pasteFiles([image('capture.png')]);
  await expect.poll(() => app.exists('capture 1.png')).toBe(true);
  expect(Buffer.from(await app.readBytes('capture.png')).equals(Buffer.from(PNG))).toBe(true);
});
