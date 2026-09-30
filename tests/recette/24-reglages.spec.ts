import { expect, recette } from './lib/recette';
import { baseVault, obsidianVault, PNG } from './lib/vaults';
import type { Locator } from '@playwright/test';
import type { Ui } from './lib/ui';

// 24. Réglages.

const radio = (settings: Locator, name: string) => settings.getByRole('radio', { name, exact: true });
/** Back to a note's tab after changing a setting. */
async function back(ui: Ui, name: string) {
  await ui.tab(name).click();
}

recette('24.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await expect(settings.locator('.settings-section > h2')).toHaveText([
    'Général',
    'Apparence',
    'Disposition',
    'Éditeur',
    'Fichiers et liens',
    'Aujourd’hui',
    'Modèles',
    'À propos',
  ]);
  // The list of sections leads to them, and follows the scroll.
  const nav = settings.getByRole('navigation', { name: 'Sections des réglages' });
  await nav.getByRole('button', { name: 'Modèles' }).click();
  await expect(settings.locator('[data-section="templates"] > h2')).toBeInViewport();
  await expect(nav.getByRole('button', { name: 'Modèles' })).toHaveAttribute('aria-current', 'true');
  await ui.page.waitForTimeout(1300);
  await settings.evaluate((el) => el.scrollTo({ top: 0 }));
  await expect(nav.getByRole('button', { name: 'Général' })).toHaveAttribute('aria-current', 'true');
  await ui.activeTab.getByRole('button', { name: 'Fermer' }).click();
  await ui.activityBar.getByRole('button', { name: 'Réglages' }).click();
  await expect(ui.page.locator('.settings-view')).toBeVisible();
  await ui.activeTab.getByRole('button', { name: 'Fermer' }).click();
  await ui.vaultMenu('Réglages');
  await expect(ui.page.locator('.settings-view')).toBeVisible();
});

recette('24.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  const html = ui.page.locator('html');
  await radio(settings, 'Papier de nuit').click();
  await expect(html).toHaveAttribute('data-paper', 'night');
  await radio(settings, 'Papier de jour').click();
  await expect(html).toHaveAttribute('data-paper', 'day');
  await radio(settings, 'Suivre le système').click();
  await ui.page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveAttribute('data-paper', 'night');
  await ui.page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-paper', 'day');
});

recette('24.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-language').selectOption('en');
  await expect(ui.page.locator('.settings-view h1')).toHaveText('Settings');
  await ui.page.keyboard.press('Control+p');
  await ui.palette.locator('input').fill('> graph');
  await expect(ui.palette.locator('.finder-item').first()).toContainText('Open the graph');
  await ui.page.keyboard.press('Escape');
  await ui.page.locator('#set-language').selectOption('fr');
  await expect(ui.page.locator('.settings-view h1')).toHaveText('Réglages');
  await ui.page.locator('#set-language').selectOption('auto');
  await expect(ui.page.locator('.settings-view h1')).toHaveText('Réglages');
});

recette('24.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-mode').selectOption('read');
  await ui.open('Idées');
  await expect(ui.reading).toBeVisible();
  await ui.page
    .locator('.settings-view')
    .waitFor({ state: 'detached' })
    .catch(() => undefined);
  await ui.settings();
  await ui.page.locator('#set-mode').selectOption('source');
  await ui.openInNewTab('Étude');
  await expect(ui.noteBar.getByRole('button', { name: 'Source' })).toBeVisible();
  await ui.settings();
  await ui.page.locator('#set-mode').selectOption('live');
  await ui.openInNewTab('Réunion');
  await expect(ui.noteBar.getByRole('button', { name: 'Écrire', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

recette('24.5', async ({ app, ui }) => {
  await app.start({
    vault: baseVault({ 'Long.md': 'Un texte assez long pour remplir la ligne. '.repeat(30) }),
    viewport: { width: 1700, height: 900 },
  });
  await ui.open('Long');
  const settings = await ui.settings();
  const group = settings.getByRole('radiogroup', { name: 'Largeur des lignes' });
  const widths: number[] = [];
  for (const choice of ['Étroite', 'Normale', 'Large', 'Toute la largeur']) {
    await radio(group, choice).click();
    await expect(radio(group, choice)).toHaveAttribute('aria-checked', 'true');
    await back(ui, 'Long');
    widths.push((await ui.editor.boundingBox())!.width);
    await ui.tab('Réglages').click();
  }
  expect(widths).toEqual([...widths].sort((a, b) => a - b));
  expect(new Set(widths).size).toBe(4);
});

recette('24.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Lignes.md': 'un\ndeux' }) });
  await ui.open('Lignes');
  await ui.mode('Lire');
  await expect(ui.reading.locator('p br')).toHaveCount(1);
  const settings = await ui.settings();
  await settings.locator('#set-breaks').click();
  await back(ui, 'Lignes');
  await expect(ui.reading.locator('p br')).toHaveCount(0);
});

recette('24.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await expect(ui.editor).toHaveAttribute('spellcheck', 'true');
  const settings = await ui.settings();
  await settings.locator('#set-spell').click();
  await back(ui, 'Idées');
  await expect(ui.editor).toHaveAttribute('spellcheck', 'false');
  await ui.settings();
  await ui.page.locator('#set-spell').click();
  await back(ui, 'Idées');
  await expect(ui.editor).toHaveAttribute('spellcheck', 'true');
});

recette('24.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Liens.md': 'Vers [[En attente]].' }) });
  const settings = await ui.settings();
  await settings.locator('#set-newfolder').selectOption('folder:Journal');
  await ui.page.keyboard.press(app.key('newNote'));
  await ui.page.keyboard.press('Escape');
  await expect.poll(() => app.exists('Journal/Sans titre.md')).toBe(true);
  await ui.page.keyboard.press('Control+k');
  await ui.palette.locator('input').fill('Par la palette');
  await ui.page.keyboard.press('Shift+Enter');
  await expect.poll(() => app.exists('Journal/Par la palette.md')).toBe(true);
  await ui.open('Liens');
  await ui.mode('Lire');
  await ui.reading.locator('a.internal-link').click();
  await expect.poll(() => app.exists('Journal/En attente.md')).toBe(true);
  await ui.settings();
  await ui.page.locator('#set-newfolder').selectOption('current');
  await ui.open('Réunion');
  await ui.page.keyboard.press(app.key('newNote'));
  await ui.page.keyboard.press('Escape');
  await expect.poll(() => app.exists('Projets/Sans titre.md')).toBe(true);
});

recette('24.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const image = [{ name: 'image.png', type: 'image/png', bytes: PNG }];
  for (const [choice, folder] of [
    ['/', ''],
    ['./', 'Projets/'],
    ['assets', 'assets/'],
  ] as const) {
    const settings = await ui.settings();
    await settings.locator('#set-attach').selectOption(choice);
    await ui.open('Réunion');
    await ui.editEnd();
    await ui.pasteFiles(image);
    await expect.poll(async () => (await app.list()).some((p) => p.startsWith(`${folder}Pasted image`))).toBe(true);
  }
});

recette('24.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-links').click();
  await ui.contextMenu('Idées.md', 'Renommer');
  await ui.page.locator('.tree-rename').fill('Pistes');
  await ui.page.locator('.tree-rename').press('Enter');
  await expect.poll(() => app.exists('Pistes.md')).toBe(true);
  expect(await app.read('Bienvenue.md')).toContain('[[Idées]]');
});

recette('24.11', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Idées.md', 'Mettre à la corbeille');
  await expect.poll(() => app.exists('.trash/Idées.md')).toBe(true);
  const settings = await ui.settings();
  await settings.locator('#set-trash').selectOption('permanent');
  await ui.contextMenu('Étude.md', 'Mettre à la corbeille');
  await expect.poll(() => app.exists('Étude.md')).toBe(false);
  expect(await app.exists('.trash/Étude.md')).toBe(false);
});

recette('24.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-daily-folder').selectOption('Journal');
  await settings.locator('#set-daily-format').fill('YYYY [semaine] DD');
  await settings.locator('#set-daily-format').press('Tab');
  await ui.page.keyboard.press('Control+Shift+D');
  const now = new Date();
  await expect
    .poll(() => app.exists(`Journal/${now.getFullYear()} semaine ${String(now.getDate()).padStart(2, '0')}.md`))
    .toBe(true);
});

recette('24.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Essai.md': '', 'Gabarits/G.md': '{{date}}' }) });
  const settings = await ui.settings();
  await settings.locator('#set-templates').selectOption('Gabarits');
  await settings.locator('#set-tpl-date').fill('YYYY');
  await settings.locator('#set-tpl-date').press('Tab');
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.press('Alt+t');
  await ui.palette.locator('.finder-item', { hasText: 'G' }).first().click();
  await expect.poll(() => app.read('Essai.md')).toBe(String(new Date().getFullYear()));
});

recette('24.14', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await expect(settings.locator('.settings-about')).toHaveText(
    /Cobblestone \d+\.\d+\.\d+\. Libre et open source, sous licence AGPL-3\.0\./,
  );
});

recette('24.15', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-attach').selectOption('assets');
  await radio(settings, 'Papier de nuit').click();
  await settings.locator('#set-language').selectOption('en');
  await ui.page.waitForTimeout(600);
  expect(JSON.parse(await app.read('.cobblestone/app.json')).attachmentLocation).toBe('assets');
  await ui.vaultMenu('Switch vault');
  await ui.recentRows.first().locator('.recent-open').click();
  const again = await ui.settings().catch(async () => {
    await ui.page.keyboard.press('Control+,');
    return ui.page.locator('.settings-view');
  });
  await expect(again.locator('#set-attach')).toHaveValue('assets');
  await app.restart();
  await expect(ui.page.locator('html')).toHaveAttribute('data-paper', 'night');
  await expect(ui.page.locator('html')).toHaveAttribute('lang', 'en');
});

recette('24.16', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  const toggle = settings.locator('#set-spell');
  await settings.locator('#set-breaks').focus();
  await ui.page.keyboard.press('Tab');
  await expect(toggle).toBeFocused();
  const outline = await toggle.evaluate((el) => getComputedStyle(el).outlineColor + ' ' + getComputedStyle(el).outlineStyle);
  expect(outline).toMatch(/255, 72, 176.*solid|srgb 1 0\.28/);
  await ui.page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
});

recette('24.17', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Texte.md': '# Titre\n\nUn paragraphe.\n\nfin' }) });
  await ui.open('Texte');
  await ui.editEnd();
  const measure = async () => ({
    text: await ui.lines.filter({ hasText: 'Un paragraphe.' }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    title: await ui.page.locator('.cm-h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    chrome: await ui.vaultName.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  });
  const before = await measure();
  const settings = await ui.settings();
  await settings.locator('#set-text-size').selectOption('20');
  await back(ui, 'Texte');
  const after = await measure();
  expect(after.text).toBe(20);
  expect(after.title).toBeGreaterThan(before.title);
  expect(after.chrome).toBe(before.chrome);
  await ui.mode('Lire');
  expect(
    await ui.reading
      .locator('p')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBe(20);
});

recette('24.18', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Long.md': 'mot '.repeat(400) }), viewport: { width: 1920, height: 1040 } });
  await ui.open('Long');
  const width = (await ui.editor.boundingBox())!.width;
  expect(width).toBeGreaterThan(650);
  expect(width).toBeLessThan(750);
});

recette('24.19', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-text-size').selectOption('19');
  await radio(settings.getByRole('radiogroup', { name: 'Largeur des lignes' }), 'Large').click();
  await ui.page.waitForTimeout(600);
  await ui.vaultMenu('Changer de coffre');
  await ui.recentRows.first().locator('.recent-open').click();
  const again = await ui.settings();
  await expect(again.locator('#set-text-size')).toHaveValue('19');
  await expect(radio(again.getByRole('radiogroup', { name: 'Largeur des lignes' }), 'Large')).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

recette('24.20', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  const settings = await ui.settings();
  await expect(settings.locator('#set-text-size')).toHaveValue('18');
});

recette('24.21', async ({ app, ui }) => {
  await app.start({
    vault: baseVault({ 'Essai.md': 'avant\n\n![[Idées]]\n\nVers [[Réunion]]\n\nfin' }),
    viewport: { width: 1280, height: 800 },
  });
  const settings = await ui.settings();
  await settings.locator('#set-text-size').selectOption('24');
  await radio(settings.getByRole('radiogroup', { name: 'Largeur des lignes' }), 'Large').click();
  await ui.open('Essai');
  await ui.editEnd();
  const embed = ui.editor.locator('.cm-embed-note');
  expect(await embed.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await ui.mode('Lire');
  await ui.hoverForPreview(ui.reading.locator('a.internal-link', { hasText: 'Réunion' }));
  const body = ui.preview.locator('.hover-preview-body');
  expect(await body.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await ui.page.mouse.move(5, 5);
  await ui.row('Tableau.canvas').click();
  const card = ui.page.locator('.canvas-node').first();
  await expect(card).toBeVisible();
  expect(await ui.overflowsSideways()).toBe(false);
});

recette('24.22', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  const search = settings.getByRole('searchbox', { name: 'Chercher un réglage' });
  await search.fill('police');
  await expect(settings.locator('.setting-text label')).toHaveText([
    'Police de l’interface',
    'Police des notes',
    'Police du code',
  ]);
  await expect(settings.locator('.settings-section:visible > h2')).toHaveText(['Apparence']);
  await search.fill('xylophone');
  await expect(settings.locator('.settings-empty')).toContainText('Aucun réglage ne correspond');
  await search.fill('');
  await expect(settings.locator('.settings-section:visible')).toHaveCount(8);
});
