import { expect, recette } from './lib/recette';
import { obsidianVault, PNG } from './lib/vaults';

// 3. Migration d'un coffre Obsidian : le coffre de test porte une configuration .obsidian/.

const obsidianFiles = () =>
  Object.fromEntries(Object.entries(obsidianVault()).filter(([p]) => p.startsWith('.obsidian/'))) as Record<string, string>;

recette('3.1', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  for (const path of ['Bienvenue.md', 'Projets', 'assets', 'Tableau.canvas']) await expect(ui.row(path)).toBeVisible();
  await expect(ui.page.locator('.tree-row[data-path^="."]')).toHaveCount(0);
});

recette('3.2', async ({ app }) => {
  await app.start({ vault: obsidianVault() });
  await expect.poll(() => app.exists('.cobblestone/app.json')).toBe(true);
  await expect.poll(() => app.exists('.cobblestone/bookmarks.json')).toBe(true);
});

recette('3.3', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  // A few changes that touch settings, bookmarks, links and files.
  const settings = await ui.settings();
  await settings.locator('#set-attach').selectOption('/');
  await ui.open('Idées');
  await ui.mode('Écrire');
  await ui.append('\nTexte ajouté.');
  await ui.page.keyboard.press('F2');
  await ui.page.keyboard.type('Idées renommées');
  await ui.page.keyboard.press('Enter');
  await expect(ui.activeTab).toContainText('Idées renommées');
  await ui.page.waitForTimeout(800);
  for (const [path, content] of Object.entries(obsidianFiles())) expect(await app.read(path)).toBe(content);
});

recette('3.4', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  await ui.open('Idées');
  await ui.mode('Écrire');
  await ui.editEnd();
  await ui.pasteFiles([{ name: 'image.png', type: 'image/png', bytes: PNG }]);
  await expect.poll(async () => (await app.list()).filter((p) => p.startsWith('assets/Pasted image'))).toHaveLength(1);
});

recette('3.5', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  await ui.page.keyboard.press(app.key('newNote'));
  await ui.page.keyboard.type('Nouvelle idée');
  await ui.page.keyboard.press('Enter');
  await expect.poll(() => app.exists('Boîte/Nouvelle idée.md')).toBe(true);
});

recette('3.6', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  await ui.page.keyboard.press('Control+Shift+D');
  const now = new Date();
  const name = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  await expect(ui.activeTab).toContainText(name);
  await expect.poll(() => app.readOr(`Journal/${name}.md`)).toContain(`# ${name}`);
});

recette('3.7', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  await expect(ui.bookmarks).toContainText('Bienvenue');
  await expect(ui.bookmarks).toContainText('Travail');
});

recette('3.8', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  await ui.open('Idées');
  await expect(ui.reading).toBeVisible();
  await expect(ui.noteBar.getByRole('button', { name: 'Lire' })).toHaveAttribute('aria-pressed', 'true');
});

recette('3.9', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault({ 'Lignes.md': 'ligne un\nligne deux\n' }) });
  await ui.open('Lignes');
  await expect(ui.reading).toContainText('ligne un');
  await expect(ui.reading.locator('p br')).toHaveCount(0);
});

recette.manuel('3.10', 'comparer à l’œil le rendu avec Obsidian, note par note');
recette.manuel('3.11', 'comparer avec les tags affichés par Obsidian, qui doit être ouvert à côté');
recette.manuel('3.12', 'comparer avec les rétroliens affichés par Obsidian, qui doit être ouvert à côté');

recette('3.13', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  await ui.row('Tableau.canvas').click();
  await expect(ui.page.locator('.canvas-node')).toHaveCount(3);
  await expect(ui.page.locator('.canvas-view')).toContainText('mène à');
  await expect(ui.page.locator('.canvas-view')).toContainText('Plan');
});

recette('3.14', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  const settings = await ui.settings();
  await expect(settings.locator('#set-attach')).toHaveValue('assets');
  await expect(settings.locator('#set-newfolder')).toHaveValue('folder:Boîte');
  await expect(settings.locator('#set-daily-folder')).toHaveValue('Journal');
  await settings.locator('#set-attach').selectOption('/');
  await ui.page.waitForTimeout(600);
  expect(await app.read('.obsidian/app.json')).toBe(obsidianFiles()['.obsidian/app.json']);
});

recette('3.15', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  const settings = await ui.settings();
  await settings.locator('#set-attach').selectOption('/');
  await ui.page.waitForTimeout(600);
  await ui.switchVault();
  await ui.recentRows.first().locator('.recent-open').click();
  const again = await ui.settings();
  await expect(again.locator('#set-attach')).toHaveValue('/');
});
