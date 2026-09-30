import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Ui } from './lib/ui';

// 8. Barre d'une note et titre.

const more = async (ui: Ui, item?: string | RegExp) => {
  await ui.noteBar.getByRole('button', { name: 'Plus' }).click();
  if (item) await ui.menuItem(item).click();
};

async function retitle(ui: Ui, name: string) {
  await ui.title.click();
  await ui.title.fill(name);
}

recette('8.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Plan');
  await ui.noteBar.locator('.crumb', { hasText: 'Projets' }).click();
  await expect(ui.row('Projets')).toHaveClass(/is-revealed/);
  const weight = await ui.noteBar.locator('.crumb.is-current').evaluate((el) => Number(getComputedStyle(el).fontWeight));
  expect(weight).toBeGreaterThanOrEqual(600);
});

recette('8.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.mode('Lire');
  await expect(ui.reading).toBeVisible();
  const read = ui.noteBar.getByRole('button', { name: 'Lire', exact: true });
  await expect(read).toHaveAttribute('aria-pressed', 'true');
  expect(await read.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(30, 42, 79)');
  await ui.mode('Écrire');
  await expect(ui.editor).toBeVisible();
});

recette('8.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.editor.click();
  await ui.page.keyboard.press('Control+e');
  await expect(ui.reading).toBeVisible();
  await ui.page.keyboard.press('Control+e');
  await expect(ui.editor).toBeVisible();
});

recette('8.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Gras.md': 'Du **gras** ici.\n' }) });
  await ui.open('Gras');
  await more(ui, 'Afficher la source Markdown');
  await expect(ui.noteBar.getByRole('button', { name: 'Source' })).toBeVisible();
  await expect(ui.editor).toContainText('**gras**');
  await more(ui, 'Afficher la source Markdown');
  await expect(ui.noteBar.getByRole('button', { name: 'Source' })).toHaveCount(0);
});

recette('8.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.noteBar.getByRole('button', { name: 'Partager' }).click();
  await expect(ui.share).toContainText('synchronisation');
  await expect(ui.share.getByRole('button', { name: /Copier un lien vers cette note/ })).toBeVisible();
  await expect(ui.share.getByRole('button', { name: 'Markdown' })).toBeVisible();
});

recette('8.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.noteBar.getByRole('button', { name: 'Partager' }).click();
  const copy = ui.share.getByRole('button', { name: /Copier un lien vers cette note/ });
  await copy.click();
  await expect(copy.locator('svg.lucide-check')).toBeVisible();
  await expect.poll(() => app.clipboard()).toBe('[[Idées]]');
});

recette('8.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.noteBar.getByRole('button', { name: 'Partager' }).click();
  await ui.share.getByRole('button', { name: 'Markdown' }).click();
  await expect.poll(() => app.clipboard()).toBe(await app.read('Idées.md'));
});

recette('8.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  const share = ui.noteBar.getByRole('button', { name: 'Partager' });
  await share.click();
  await ui.share.getByRole('button', { name: 'Fermer' }).click();
  await expect(ui.share).toHaveCount(0);
  await share.click();
  await ui.page.keyboard.press('Escape');
  await expect(ui.share).toHaveCount(0);
  await share.click();
  await ui.editor.click();
  await expect(ui.share).toHaveCount(0);
});

recette('8.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.noteBar.getByRole('button', { name: 'Ajouter aux favoris' }).click();
  const on = ui.noteBar.getByRole('button', { name: 'Retirer des favoris' });
  await expect(on).toHaveClass(/is-on/);
  await expect(ui.bookmarks).toContainText('Idées');
  await on.click();
  await expect(ui.bookmarks).toHaveCount(0);
});

recette('8.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Plan');
  await more(ui, 'Diviser à droite');
  await expect(ui.panes).toHaveCount(2);
  await ui.activeTab.getByRole('button', { name: 'Fermer' }).click();
  await more(ui, 'Diviser en bas');
  await expect(ui.page.locator('.split.is-column')).toBeVisible();
  await ui.activeTab.getByRole('button', { name: 'Fermer' }).click();
  await more(ui, 'Afficher la source Markdown');
  await expect(ui.noteBar.getByRole('button', { name: 'Source' })).toBeVisible();
  await more(ui, 'Afficher la source Markdown');
  await more(ui, 'Ouvrir le graphe autour de cette note');
  await expect(ui.page.locator('.graph-view')).toBeVisible();
  await ui.panes.first().locator('.cm-content').click();
  await more(ui, 'Montrer cette note dans la barre latérale');
  await expect(ui.row('Projets/Plan.md')).toHaveClass(/is-revealed/);
  await more(ui, 'Copier un lien vers cette note');
  await expect.poll(() => app.clipboard()).toBe('[[Plan]]');
  await more(ui, 'Mettre cette note à la corbeille');
  await expect.poll(() => app.exists('.trash/Plan.md')).toBe(true);
});

recette('8.11', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.margin.getByRole('button', { name: 'Masquer la marge' }).click();
  await expect(ui.margin).toHaveCount(0);
  await ui.noteBar.getByRole('button', { name: 'Afficher la marge' }).click();
  await expect(ui.margin).toBeVisible();
});

recette('8.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await retitle(ui, 'Pistes');
  await ui.title.press('Enter');
  await expect.poll(() => app.exists('Pistes.md')).toBe(true);
  await expect.poll(() => app.read('Bienvenue.md')).toContain('[[Pistes]]');
});

recette('8.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await retitle(ui, 'Pistes');
  await ui.title.press('Enter');
  await ui.page.keyboard.type('Tapé aussitôt');
  await expect.poll(() => app.readOr('Pistes.md')).toContain('Tapé aussitôt');
  await expect(ui.title).toHaveValue('Pistes');
});

recette('8.14', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await retitle(ui, 'Pistes');
  await ui.title.press('Escape');
  await expect(ui.title).toHaveValue('Idées');
  await ui.page.waitForTimeout(300);
  expect(await app.exists('Pistes.md')).toBe(false);
});

recette('8.15', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await retitle(ui, 'Pistes');
  await ui.editor.click();
  await expect.poll(() => app.exists('Pistes.md')).toBe(true);
});

recette('8.16', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await retitle(ui, '');
  await ui.title.press('Enter');
  await expect(ui.title).toHaveValue('Idées');
  expect(await app.exists('Idées.md')).toBe(true);
});

recette('8.17', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await retitle(ui, 'a/b');
  await ui.title.press('Enter');
  await expect(ui.toasts.filter({ hasText: 'Les noms ne peuvent pas contenir' })).toHaveClass(/is-error/);
  await expect(ui.title).toHaveValue('Idées');
});

recette('8.18', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await retitle(ui, 'Étude');
  await ui.title.press('Enter');
  await expect(ui.toasts.filter({ hasText: 'existe déjà ici' })).toHaveClass(/is-error/);
  await expect(ui.title).toHaveValue('Idées');
});

recette('8.19', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  const oneLine = (await ui.title.boundingBox())!.height;
  await retitle(ui, 'Un titre vraiment très long qui ne tient certainement pas sur une seule ligne de la page');
  await expect.poll(async () => (await ui.title.boundingBox())!.height).toBeGreaterThan(oneLine * 1.5);
});

recette('8.20', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press(app.key('newNote'));
  await expect(ui.title).toBeFocused();
  await expect(ui.title).toHaveValue('Sans titre');
  await ui.page.keyboard.type('Courses');
  await expect(ui.title).toHaveValue('Courses');
});

recette('8.21', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.editor.click();
  await ui.page.keyboard.press('F2');
  await expect(ui.title).toBeFocused();
  expect(await ui.title.evaluate((el: HTMLTextAreaElement) => el.value.slice(el.selectionStart, el.selectionEnd))).toBe('Idées');
});

recette('8.22', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Vide.md': '' }) });
  await ui.open('Vide');
  await expect(ui.status).toContainText('0 mots');
  await ui.append('un deux trois');
  await expect(ui.status).toContainText('3 mots');
  await expect(ui.status).toContainText('11 caractères'); // spaces are not counted
  await ui.open('Idées');
  await expect(ui.status).toContainText('1 rétroliens');
  expect(await ui.status.evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toContain('tabular-nums');
});

recette('8.23', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.margin.getByRole('button', { name: 'Masquer la marge' }).click();
  await ui.status.getByRole('button', { name: /rétroliens/ }).click();
  await expect(ui.margin).toBeVisible();
});

recette('8.24', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await app.remove('Idées.md');
  await expect(ui.tab('Idées')).toHaveCount(0, { timeout: 8000 });
});

recette('8.25', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await app.electron.evaluate(({ shell }) => {
    const calls: string[] = [];
    (globalThis as { __reveals?: string[] }).__reveals = calls;
    shell.showItemInFolder = (path: string) => void calls.push(path);
  });
  await ui.open('Idées');
  await more(ui, 'Afficher dans le gestionnaire de fichiers');
  await expect
    .poll(() => app.electron.evaluate(() => (globalThis as { __reveals?: string[] }).__reveals))
    .toEqual([`${app.root}/Idées.md`]);
});

recette('8.26', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), open: false });
  await app.makeUnreadable('Idées.md');
  await ui.recentRows.first().locator('.recent-open').click();
  await ui.row('Idées.md').click();
  await expect(ui.pane.locator('.editor-failure, .reading-failure')).toContainText(
    'Impossible de lire cette note : le système refuse l’accès à cet emplacement.',
  );
});
