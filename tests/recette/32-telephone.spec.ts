import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';

// 32. Téléphone.

recette('32.1', async ({ app, ui }) => {
  await app.start({ vault: 'demo', iphone: true });
  const page = ui.page;
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /maximum-scale=1/);
  const unzoomed = async (field: import('@playwright/test').Locator) => {
    await field.first().tap();
    const size = await field.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  };
  await ui.phone.row('Bienvenue').tap();
  await unzoomed(ui.phone.title);
  await ui.phone.tools.getByRole('button', { name: 'Modifier' }).tap();
  await unzoomed(page.locator('.mobile-view .cm-content'));
  await ui.phone.back.tap();
  await ui.phone.searchPill.tap();
  await unzoomed(ui.phone.searchField);
});

recette('32.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await expect(phone.pins.first()).toContainText('Aujourd’hui');
  await expect(phone.row('Bienvenue')).toContainText('Voir le Plan et les Idées.');
  await expect(phone.row('Plan')).toContainText('Projets');
  for (const tab of ['Récentes', 'Dossiers', 'Tags']) await expect(phone.homeTab(tab)).toBeVisible();
  expect(await ui.overflowsSideways()).toBe(false);
});

recette('32.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await phone.row('Bienvenue').tap();
  await expect(phone.home).toHaveCount(0);
  await expect(phone.screen.locator('.reading-view')).toBeVisible();
  await expect(phone.back).toHaveText('Notes');
  await expect(phone.tools.getByRole('button', { name: 'Modifier' })).toBeVisible();
  await expect(ui.tabs).toHaveCount(0);
});

recette('32.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await phone.row('Bienvenue').tap();
  await phone.screen.locator('a.internal-link', { hasText: 'Plan' }).tap();
  await expect(phone.title).toHaveValue('Plan');
  await expect(phone.back).toHaveText('Bienvenue');
  await ui.page.goBack();
  await expect(phone.title).toHaveValue('Bienvenue');
  await phone.back.tap();
  await expect(phone.home).toBeVisible();
});

recette('32.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await phone.homeTab('Dossiers').tap();
  await phone.row('Projets').tap();
  await expect(phone.row('Réunion')).toBeVisible();
  await phone.longPress(phone.row('Réunion'));
  for (const item of ['Épingler', 'Partager', 'Renommer', 'Déplacer vers…', 'Dupliquer', 'Mettre à la corbeille'])
    await expect(ui.menuItem(item)).toBeVisible();
  const menu = (await ui.menu.boundingBox())!;
  expect(menu.y + menu.height).toBeGreaterThan(844 - 40);
  await ui.page.keyboard.press('Escape');
  await phone.folderUp.tap();
  await expect(phone.row('Projets')).toBeVisible();
});

recette('32.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await phone.searchPill.tap();
  await expect(phone.searchField).toBeFocused();
  const field = (await phone.searchField.boundingBox())!;
  expect(field.y).toBeGreaterThan(844 / 2);
  await phone.searchField.fill('plan');
  await expect(phone.search.locator('.find-hit.is-name', { hasText: 'Plan' })).toBeVisible();
  await expect(phone.search.locator('.find-hit.is-text').first()).toBeVisible();
  await phone.searchField.fill('Courses');
  await expect(phone.search.locator('.find-hit.is-create')).toContainText('Courses');
  await phone.cancelSearch.tap();
  await expect(phone.search).toHaveCount(0);
  await expect(phone.home).toBeVisible();
});

recette('32.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await phone.row('Idées').tap();
  await phone.tools.getByRole('button', { name: 'Modifier' }).tap();
  const editor = phone.screen.locator('.cm-content');
  await editor.tap();
  await ui.page.keyboard.press('Control+End');
  await ui.page.keyboard.type('\nÉcrit au téléphone');
  await ui.page.locator('.cm-content').blur();
  await phone.tools.getByRole('button', { name: 'Terminé' }).tap();
  await expect(phone.screen.locator('.reading-view')).toContainText('Écrit au téléphone');
  await expect.poll(() => app.read('Idées.md')).toContain('Écrit au téléphone');
});

recette('32.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await phone.newNote.tap();
  await expect(phone.title).toBeFocused();
  await expect(phone.title).toHaveValue('Sans titre');
  await expect(phone.screen.locator('.cm-content')).toBeVisible();
  await phone.back.tap();
  await phone.longPress(phone.newNote);
  for (const item of ['Ouvrir la note du jour', 'Nouveau canvas ici', 'Nouveau dossier'])
    await expect(ui.menuItem(item)).toBeVisible();
});

recette('32.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await phone.homeTab('Tags').tap();
  await phone.tags.filter({ hasText: '#idee' }).tap();
  await expect(phone.searchField).toHaveValue('tag:#idee');
  await expect(phone.search.locator('.find-hit', { hasText: 'Idées' })).toBeVisible();
});

recette('32.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await phone.row('Idées').tap();
  await phone.screen.getByRole('button', { name: 'Plus' }).tap();
  for (const item of [
    'Partager',
    'Renommer cette note',
    'Déplacer vers…',
    'Copier un lien vers cette note',
    'Ouvrir le graphe autour de cette note',
    'Afficher dans son dossier',
    'Afficher la source Markdown',
    'Mettre cette note à la corbeille',
  ])
    await expect(ui.menuItem(item)).toBeVisible();
  await ui.menuItem('Déplacer vers…').tap();
  await ui.palette.locator('input').fill('Projets');
  await ui.palette.locator('.finder-item', { hasText: 'Projets' }).first().tap();
  await expect.poll(() => app.exists('Projets/Idées.md')).toBe(true);
});

recette('32.11', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), iphone: true });
  const { phone } = ui;
  await phone.home.getByRole('button', { name: 'Graphe' }).tap();
  await expect(phone.screen.locator('.graph-view')).toBeVisible();
  await phone.back.tap();
  const settings = await ui.settings();
  await expect(settings).toBeVisible();
  await phone.back.tap();
  await expect(phone.home).toBeVisible();
  await phone.searchPill.tap();
  await phone.search.getByRole('button', { name: 'Commandes' }).tap();
  await ui.palette.locator('input').fill('> jour');
  await expect(ui.palette.locator('.finder-item', { hasText: 'Ouvrir la note du jour' })).toBeVisible();
});

recette.manuel(
  '32.12',
  'Le geste du bord gauche ne vaut que pour l’app installée sur l’écran d’accueil, que l’émulation ne reproduit pas',
);
