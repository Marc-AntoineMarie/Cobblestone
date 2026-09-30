import { chmod, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, recette } from './lib/recette';
import { baseVault, manyNotes } from './lib/vaults';

// 29. Robustesse et performance.

recette('29.1', async ({ app, ui }, testInfo) => {
  testInfo.setTimeout(120_000); // preparing 5 200 notes takes a while, opening them must not
  await app.start({ vault: manyNotes(5200), name: 'Très gros coffre', open: false });
  const started = Date.now();
  await ui.recentRows.first().locator('.recent-open').click();
  await ui.page.locator('.workbench').waitFor({ timeout: 30_000 });
  expect(Date.now() - started).toBeLessThan(8000);
  const typing = Date.now();
  await ui.find.fill('Note 4321');
  await expect(ui.findResults.locator('.find-hit').first()).toContainText('Note 4321');
  expect(Date.now() - typing).toBeLessThan(3000);
  await ui.find.fill('');
  await ui.row('Dossier 0').click();
  await expect(ui.row('Dossier 0/Note 0.md')).toBeVisible();
});

recette('29.2', async ({ app, ui }) => {
  const big = Array.from({ length: 20_000 }, (_, i) => `Ligne ${i} : un peu de texte pour grossir la note.`).join('\n');
  expect(big.length).toBeGreaterThan(1_000_000);
  await app.start({ vault: baseVault({ 'Gros.md': big }) });
  await ui.open('Gros');
  await ui.editor.click();
  await ui.page.keyboard.press('Control+End');
  await ui.page.keyboard.type(' fin modifiée');
  await expect.poll(async () => (await app.read('Gros.md')).endsWith('fin modifiée'), { timeout: 10_000 }).toBe(true);
});

recette('29.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Vide.md': '', 'SANS-EXTENSION': 'brut', 'dossier/LISEZMOI': '' }) });
  await ui.open('Vide');
  await ui.append('rempli');
  await ui.row('SANS-EXTENSION').click();
  await expect(ui.view).toBeVisible();
  await expect(ui.toasts).toHaveCount(0);
});

recette('29.4', async ({ app, ui }) => {
  await app.start({
    vault: baseVault({
      'Boucle A.md': 'A intègre B :\n\n![[Boucle B]]\n\n[[Nulle part]] [[Ailleurs#Titre]] ![[Absent.png]]',
      'Boucle B.md': 'B intègre A :\n\n![[Boucle A]]',
    }),
  });
  await ui.open('Boucle A');
  await ui.mode('Lire');
  await expect(ui.reading).toContainText('B intègre A');
  await expect(ui.reading.locator('.internal-embed.is-missing').first()).toBeVisible();
  await ui.mode('Écrire');
  await ui.editEnd();
  await expect(ui.editor).toContainText('B intègre A');
});

recette('29.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  // The app already running: the network goes away.
  if (app.desktop) {
    await app.electron.evaluate(({ session }) => session.defaultSession.enableNetworkEmulation({ offline: true }));
  } else {
    await ui.page.context().setOffline(true);
  }
  await ui.open('Idées');
  await ui.append('\nHors ligne');
  await expect.poll(() => app.read('Idées.md')).toContain('Hors ligne');
  await ui.page.keyboard.press('Control+g');
  await expect(ui.view.locator('.graph-view')).toBeVisible();
  await ui.row('Tableau.canvas').click();
  await expect(ui.page.locator('.canvas-node').first()).toBeVisible();
  await ui.page.keyboard.press('Control+,');
  await expect(ui.view.locator('.settings-view')).toBeVisible();
});

recette.manuel('29.6', 'une heure d’utilisation réelle, pour juger de la fluidité dans la durée');

recette('29.7', async ({ app, ui }) => {
  const files = Object.fromEntries(Array.from({ length: 1500 }, (_, i) => [`Gros dossier/Note ${i}.md`, `note ${i}`]));
  await app.start({ vault: baseVault(files) });
  await ui.contextMenu('Gros dossier', 'Renommer');
  await ui.page.locator('.tree-rename').fill('Dossier déplacé');
  await ui.page.locator('.tree-rename').press('Enter');
  // Quit while the move is under way.
  await app.restart();
  const all = await app.list();
  const kept = all.filter((p) => /^(Gros dossier|Dossier déplacé)\/Note \d+\.md$/.test(p));
  expect(kept).toHaveLength(1500);
});

recette(
  '29.8',
  async ({ app, ui }) => {
    await app.start({ vault: baseVault({ 'Verrouillé/Note.md': 'x' }) });
    // A folder the system refuses to write into.
    await chmod(path.join(app.root, 'Verrouillé'), 0o555);
    await ui.contextMenu('Verrouillé', 'Nouvelle note ici');
    const toast = ui.toasts.first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('le système refuse l’accès à cet emplacement');
    await expect(toast).not.toContainText(/Error invoking|EACCES|ENOENT/);
    await chmod(path.join(app.root, 'Verrouillé'), 0o755);
    await mkdir(path.join(app.root, 'tmp'), { recursive: true });
  },
  { seulement: ['bureau'] },
);

recette(
  '29.8',
  async ({ app, ui }) => {
    await app.start({ vault: baseVault(), open: false });
    await app.makeUnreadable('Idées.md');
    await ui.recentRows.first().locator('.recent-open').click();
    await ui.row('Idées.md').click();
    await expect(ui.view).toContainText('le système refuse l’accès à cet emplacement');
    await expect(ui.view).not.toContainText(/NotAllowedError|DOMException/);
  },
  { seulement: ['web'] },
);
