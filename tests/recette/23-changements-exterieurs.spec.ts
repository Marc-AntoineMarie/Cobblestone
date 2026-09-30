import { cp, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';

// 23. Changements faits par un autre programme.

/** The web app polls its folders every few seconds: give it time. */
const SLOW = { timeout: 10_000 };

recette('23.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Essai.md': 'ligne un\nligne deux\nligne trois' }) });
  await ui.open('Essai');
  await ui.gotoLine(2);
  await app.write('Essai.md', 'ligne un modifiée ailleurs\nligne deux\nligne trois');
  await expect(ui.editor).toContainText('modifiée ailleurs', SLOW);
  await ui.page.keyboard.type(' (curseur)');
  await expect.poll(() => app.read('Essai.md')).toBe('ligne un modifiée ailleurs\nligne deux\nligne trois (curseur)');
});

recette('23.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await app.write('Venue d’ailleurs.md', 'bonjour');
  await expect(ui.row('Venue d’ailleurs.md')).toBeVisible(SLOW);
});

recette('23.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await app.remove('Idées.md');
  await expect(ui.row('Idées.md')).toHaveCount(0, SLOW);
  await expect(ui.tab('Idées')).toHaveCount(0);
});

recette('23.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await app.move('Idées.md', 'Pistes.md');
  await expect(ui.row('Pistes.md')).toBeVisible(SLOW);
  await expect(ui.row('Idées.md')).toHaveCount(0);
  await ui.page.waitForTimeout(500);
  expect(await app.read('Bienvenue.md')).toContain('[[Idées]]');
});

recette('23.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  // Like "git pull": several notes change at once.
  await Promise.all([
    app.write('Idées.md', 'tiré : idées'),
    app.write('Étude.md', 'tiré : étude'),
    app.write('Projets/Réunion.md', 'tiré : réunion'),
    app.write('Nouvelle du dépôt.md', 'tirée'),
  ]);
  await expect(ui.row('Nouvelle du dépôt.md')).toBeVisible(SLOW);
  for (const [name, text] of [
    ['Idées', 'tiré : idées'],
    ['Étude', 'tiré : étude'],
    ['Réunion', 'tiré : réunion'],
  ]) {
    await ui.open(name!);
    await expect(ui.editor).toContainText(text!, SLOW);
  }
});

recette('23.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Essai.md': 'début' }) });
  await ui.open('Essai');
  await ui.editEnd();
  await ui.page.keyboard.type(' un', { delay: 30 });
  await app.write('Essai.md', 'début réécrit ailleurs');
  await ui.page.keyboard.type(' deux trois', { delay: 30 });
  await ui.page.waitForTimeout(1500);
  expect(await app.read('Essai.md')).toContain('un deux trois');
});

recette('23.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await app.write('.git/config', '[core]');
  await app.write('.stfolder/marque', '');
  await app.write('Témoin.md', 'pour attendre le rafraîchissement');
  await expect(ui.row('Témoin.md')).toBeVisible(SLOW);
  await expect(ui.page.locator('.tree-row[data-path^="."]')).toHaveCount(0);
});

// ------------------------------------------------------------- the vault's own folder (desktop)

recette('23.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.open('Idées');
  await rename(app.root, path.join(path.dirname(app.root), 'MonCoffre bis'));
  await expect(ui.lost.locator('h2')).toHaveText(/« MonCoffre » s.appelle maintenant « MonCoffre bis »/, { timeout: 6000 });
  await expect(ui.tab('Idées')).toBeAttached();
});

recette('23.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.open('Idées');
  const renamed = path.join(path.dirname(app.root), 'MonCoffre bis');
  await rename(app.root, renamed);
  await ui.lost.getByRole('button', { name: 'Suivre ce changement' }).click();
  await expect(ui.vaultName).toHaveText('MonCoffre bis');
  await expect(ui.tab('Idées')).toBeVisible();
  await ui.append('\nÉcrit au nouvel endroit');
  await expect
    .poll(async () => (await import('node:fs/promises')).readFile(path.join(renamed, 'Idées.md'), 'utf8'))
    .toContain('Écrit au nouvel endroit');
});

recette('23.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.open('Idées');
  const renamed = path.join(path.dirname(app.root), 'MonCoffre bis');
  await rename(app.root, renamed);
  await expect(ui.lost).toBeVisible({ timeout: 6000 });
  await rename(renamed, app.root);
  await expect(ui.lost).toHaveCount(0, { timeout: 6000 });
  await expect(ui.vaultName).toHaveText('MonCoffre');
  await ui.append('\nToujours là');
  await expect.poll(() => app.read('Idées.md')).toContain('Toujours là');
});

recette('23.11', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.open('Idées');
  await ui.editEnd();
  await ui.page.keyboard.type(' avant', { delay: 20 });
  const renamed = path.join(path.dirname(app.root), 'MonCoffre bis');
  await rename(app.root, renamed);
  await ui.page.keyboard.type(' pendant', { delay: 20 });
  await expect(ui.lost).toBeVisible({ timeout: 6000 });
  await ui.page.waitForTimeout(800);
  const { existsSync } = await import('node:fs');
  expect(existsSync(app.root)).toBe(false);
  await ui.lost.getByRole('button', { name: 'Suivre ce changement' }).click();
  await expect(ui.vaultName).toHaveText('MonCoffre bis');
  const text = await (await import('node:fs/promises')).readFile(path.join(renamed, 'Idées.md'), 'utf8');
  expect(text).toContain('avant');
});

recette('23.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.open('Idées');
  await rm(app.root, { recursive: true });
  await expect(ui.lost.locator('h2')).toHaveText(/introuvable/, { timeout: 6000 });
  await ui.lost.getByRole('button', { name: 'Fermer le coffre' }).click();
  await expect(ui.launcher).toBeVisible();
});

recette('23.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.open('Idées');
  // Another drive: the copy there has a new folder identity, so it is not found by itself.
  const usb = path.join(await app.folder('Clé USB'), 'MonCoffre');
  await cp(app.root, usb, { recursive: true });
  await rm(app.root, { recursive: true });
  await expect(ui.lost.locator('h2')).toHaveText(/introuvable/, { timeout: 6000 });
  await app.answerFolderDialog(usb);
  await ui.lost.getByRole('button', { name: /Retrouver le dossier/ }).click();
  await expect(ui.vaultName).toHaveText('MonCoffre');
  await expect(ui.row('Idées.md')).toBeVisible();
});
