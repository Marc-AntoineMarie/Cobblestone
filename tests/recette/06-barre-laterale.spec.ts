import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Cobble } from './lib/cobble';

// 6. Barre latérale : coffre, favoris, tags, pied.

const withBookmarks = (items: object[]) => baseVault({ '.cobblestone/bookmarks.json': JSON.stringify({ items }) });
const bookmark = (ui: { bookmarks: import('@playwright/test').Locator }, name: string) =>
  ui.bookmarks.locator('.bookmark-row').filter({ has: ui.bookmarks.page().locator('.tree-name', { hasText: name }) });
const today = () => new Date().toLocaleDateString('sv-SE');

recette('6.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.vaultMenu();
  await expect(ui.menuItem('Réglages')).toBeVisible();
  await expect(ui.menuItem('Changer de coffre')).toBeVisible();
});

recette('6.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.append('\nTapé juste avant de partir');
  await ui.vaultMenu('Changer de coffre');
  await expect.poll(() => app.read('Idées.md')).toContain('Tapé juste avant de partir');
});

recette('6.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await expect(ui.sideToggle('left')).toHaveAttribute('aria-pressed', 'true');
  await ui.sideToggle('left').click();
  await expect(ui.rail).toHaveCount(0);
  await expect(ui.sideToggle('left')).toHaveAttribute('aria-pressed', 'false');
});

recette('6.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.sideToggle('left').click();
  await expect(ui.rail).toHaveCount(0);
  await ui.sideToggle('left').click();
  await expect(ui.rail).toBeVisible();
});

recette('6.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.activityBar.getByRole('button', { name: /Aujourd.hui/ }).click();
  await expect(ui.activeTab).toContainText(today());
  await expect.poll(() => app.exists(`${today()}.md`)).toBe(true);
});

recette('6.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.activityBar.getByRole('button', { name: 'Graphe' }).click();
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.pane.locator('.graph-view')).toBeVisible();
});

recette('6.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await expect(ui.row('Bienvenue.md')).toBeVisible();
  await expect(ui.bookmarks).toHaveCount(0);
});

recette('6.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Idées.md', 'Ajouter aux favoris');
  await expect(bookmark(ui, 'Idées')).toBeVisible();
});

recette('6.9', async ({ app, ui }) => {
  await app.start({ vault: withBookmarks([{ type: 'file', ctime: 1, path: 'Idées.md' }]) });
  await ui.open('Bienvenue');
  await bookmark(ui, 'Idées').click();
  await expect(ui.activeTab).toContainText('Idées');
  await expect(ui.tabs).toHaveCount(1);
  await expect(bookmark(ui, 'Idées')).toHaveClass(/is-active/);
  await ui.open('Bienvenue');
  await bookmark(ui, 'Idées').click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
});

recette('6.10', async ({ app, ui }) => {
  const long = '\n\nParagraphe.'.repeat(80);
  await app.start({
    vault: withBookmarks([{ type: 'file', ctime: 1, path: 'Projets/Plan.md', subpath: '#Suite' }]),
  });
  await app.write('Projets/Plan.md', `# Plan${long}\n\n## Suite\n\nLa suite.\n`);
  await ui.page.waitForTimeout(500);
  await bookmark(ui, 'Plan › Suite').click();
  await expect(ui.editor.locator('.cm-line', { hasText: 'Suite' }).first()).toBeInViewport();
});

recette('6.11', async ({ app, ui }) => {
  await app.start({ vault: withBookmarks([{ type: 'folder', ctime: 1, path: 'Projets' }]) });
  await bookmark(ui, 'Projets').click();
  await expect(ui.row('Projets')).toHaveAttribute('aria-expanded', 'true');
  await expect(ui.row('Projets')).toHaveClass(/is-revealed/);
});

recette('6.12', async ({ app, ui }) => {
  await app.start({ vault: withBookmarks([{ type: 'search', ctime: 1, query: 'tag:#projet' }]) });
  await bookmark(ui, 'tag:#projet').click();
  await expect(ui.find).toHaveValue('tag:#projet');
  await expect(ui.findResults.locator('.find-hit')).toHaveCount(2);
});

recette('6.13', async ({ app, ui }) => {
  await app.start({
    vault: withBookmarks([
      { type: 'group', ctime: 1, title: 'Travail', items: [{ type: 'file', ctime: 2, path: 'Projets/Plan.md' }] },
    ]),
  });
  const group = bookmark(ui, 'Travail');
  await group.click();
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  const child = bookmark(ui, 'Plan');
  const [groupBox, childBox] = [await group.locator('.tree-name').boundingBox(), await child.locator('.tree-name').boundingBox()];
  expect(childBox!.x).toBeGreaterThan(groupBox!.x);
  await group.click();
  await expect(child).toHaveCount(0);
});

recette('6.14', async ({ app, ui }) => {
  await app.start({
    vault: withBookmarks([
      { type: 'file', ctime: 1, path: 'Idées.md' },
      { type: 'file', ctime: 2, path: 'Étude.md' },
    ]),
  });
  await bookmark(ui, 'Idées').click({ button: 'right' });
  await ui.menuItem('Retirer des favoris').click();
  await expect(bookmark(ui, 'Idées')).toHaveCount(0);
  await expect(bookmark(ui, 'Étude')).toBeVisible();
});

recette('6.15', async ({ app, ui }) => {
  await app.start({ vault: withBookmarks([{ type: 'file', ctime: 1, path: 'Idées.md' }]) });
  const title = ui.bookmarks.getByRole('button', { name: 'Favoris' });
  await title.click();
  await expect(bookmark(ui, 'Idées')).toHaveCount(0);
  await title.click();
  await expect(bookmark(ui, 'Idées')).toBeVisible();
});

recette('6.16', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const names = await ui.tags.locator('.tag-name').allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  const counts = await ui.tags
    .locator('.tree-count')
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().right)));
  expect(new Set(counts).size).toBe(1);
  const hash = await ui.tags
    .locator('.tag-hash')
    .first()
    .evaluate((e) => getComputedStyle(e).color);
  expect(hash).toMatch(/rgb\(255, 72, 176\)|rgb\(192, 39, 126\)/);
});

recette('6.17', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const parent = ui.tags.locator('.tag-row', { hasText: '#projet' }).first();
  await expect(parent.locator('.tree-count')).toHaveText('2');
  await parent.locator('.chevron-button').click();
  await expect(ui.tags.locator('.tag-row', { hasText: '#alpha' })).toBeVisible();
});

recette('6.18', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.tags.getByRole('button', { name: '#journal' }).click();
  await expect(ui.find).toHaveValue('tag:#journal');
  await expect(ui.findResults.locator('.find-hit')).toHaveText([/2026-09-29/]);
});

recette('6.19', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const title = ui.tags.getByRole('button', { name: 'Tags' });
  await title.click();
  await expect(ui.tags.locator('.tag-row')).toHaveCount(0);
  await title.click();
  await expect(ui.tags.locator('.tag-row').first()).toBeVisible();
});

recette('6.20', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  const bar = ui.statusBar;
  await expect(bar.getByRole('status')).toContainText('Sur cet appareil');
  await expect(bar.locator('.press-status svg rect')).toHaveCount(1);
  await expect(ui.status).toContainText(/\d+ mots/);
  await expect(bar.getByRole('button', { name: 'Apparence' })).toBeVisible();
});

recette('6.21', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.activityBar.getByRole('button', { name: 'Réglages' }).click();
  await expect(ui.activeTab).toContainText('Réglages');
  await expect(ui.page.locator('.settings-view')).toBeVisible();
});

async function recordOpenPath(app: Cobble) {
  await app.electron.evaluate(({ shell }) => {
    const calls: string[] = [];
    (globalThis as { __opened?: string[] }).__opened = calls;
    shell.openPath = async (path: string) => {
      calls.push(path);
      return '';
    };
  });
  return () => app.electron.evaluate(() => (globalThis as { __opened?: string[] }).__opened ?? []);
}

recette('6.22', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const opened = await recordOpenPath(app);
  await ui.vaultMenu('Ouvrir le dossier du coffre');
  await expect.poll(opened).toEqual([app.root]);
});

recette('6.23', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.vaultMenu();
  await expect(ui.menu).not.toContainText('Ouvrir le dossier du coffre');
});

recette('6.24', async ({ app, ui }) => {
  await app.start({ vault: 'demo' });
  await ui.vaultMenu();
  await expect(ui.menu).not.toContainText('Ouvrir le dossier du coffre');
});

recette('6.25', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const field = ui.topBar.getByRole('button', { name: /Rechercher, ouvrir une note ou lancer une commande/ });
  await expect(field.locator('kbd')).toHaveText(/Ctrl\+K|⌘K/);
  await field.click();
  await expect(ui.palette).toBeVisible();
  await ui.palette.locator('input').fill('Plan');
  await ui.page.keyboard.press('Enter');
  await expect(ui.activeTab).toContainText('Plan');
});

recette('6.26', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  // Folded and out of sight: the activity bar brings it back.
  await ui.tags.locator('.section-toggle').click();
  await expect(ui.tags.locator('.tag-row')).toHaveCount(0);
  await ui.sideToggle('left').click();
  await expect(ui.rail).toHaveCount(0);
  await ui.activityBar.getByRole('button', { name: 'Tags' }).click();
  await expect(ui.rail).toBeVisible();
  await expect(ui.tags.locator('.tag-row').first()).toBeInViewport();
  await ui.activityBar.getByRole('button', { name: 'Recherche' }).click();
  await expect(ui.find).toBeFocused();
});

recette('6.27', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  // A note with properties: every panel on the right has something to show.
  await ui.open('Étude');
  const menu = async (panel: string, item: string) => {
    await ui.panel(panel).locator('.panel-head').click({ button: 'right' });
    await ui.menuItem(item).click();
  };
  await menu('tags', 'Mettre à droite');
  await expect(ui.margin.locator('[data-panel="tags"]')).toBeVisible();
  await expect(ui.rail.locator('[data-panel="tags"]')).toHaveCount(0);
  await menu('tags', 'Monter');
  const order = () => ui.margin.locator('.panel').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.panel));
  expect((await order()).indexOf('tags')).toBeLessThan((await order()).indexOf('properties'));
  await menu('search', 'Descendre');
  expect(await ui.rail.locator('.panel').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.panel))).toEqual([
    'files',
    'search',
  ]);
  await menu('files', 'Masquer ce panneau');
  await expect(ui.panel('files')).toHaveCount(0);
});

recette('6.28', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  const tags = ui.panel('tags').locator('.panel-head');
  await tags.dragTo(ui.margin.locator('[data-panel="outline"] .panel-head'));
  const order = await ui.margin.locator('.panel').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.panel));
  expect(order.indexOf('tags')).toBe(order.indexOf('outline') - 1);
  await expect(ui.rail.locator('[data-panel="tags"]')).toHaveCount(0);
});

recette('6.29', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.panel('tags').locator('.panel-head').click({ button: 'right' });
  await ui.menuItem('Masquer ce panneau').click();
  await expect(ui.tags).toHaveCount(0);
  await ui.sideToggle('left').click();
  await ui.command('Afficher le panneau « Tags »');
  await expect(ui.rail.locator('[data-panel="tags"] .tag-row').first()).toBeVisible();
});

recette('6.30', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  const button = ui.statusBar.getByRole('button', { name: 'Apparence' });
  await button.click();
  const quick = ui.page.getByRole('dialog', { name: 'Apparence' });
  await expect(quick).toBeVisible();
  await quick.getByRole('radio', { name: 'Kraft' }).click();
  await expect.poll(() => ui.page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(239, 228, 208)');
  await quick.getByRole('button', { name: 'Plus grand' }).click();
  await expect(quick.locator('output')).toHaveText('17 px');
  await ui.page.keyboard.press('Escape');
  await expect(quick).toHaveCount(0);
  await button.click();
  await ui.page.getByRole('dialog', { name: 'Apparence' }).getByRole('button', { name: 'Tous les réglages d’apparence' }).click();
  await expect(ui.view.locator('[data-section="appearance"] > h2')).toBeInViewport();
});

recette('6.31', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), viewport: { width: 700, height: 800 } });
  await expect(ui.vaultName).toBeVisible();
  await expect(ui.topBar.locator('.command-field-text')).toBeHidden();
  await expect(ui.sideToggle('left')).toBeVisible();
  await expect(ui.activityBar).toHaveCount(0);
  expect(await ui.overflowsSideways()).toBe(false);
});

recette('6.32', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.statusBar.getByRole('button', { name: 'Apparence' }).click();
  await ui.page.getByRole('dialog', { name: 'Apparence' }).getByRole('radio', { name: 'Concentration' }).click();
  await expect(ui.rail).toHaveCount(0);
  await expect(ui.statusBar).toHaveCount(0);
  await ui.command('Disposition : Classique');
  await expect(ui.rail).toBeVisible();
  await expect(ui.statusBar).toBeVisible();
  await ui.command('Disposition : Miroir');
  await expect(ui.margin.locator('[data-panel="files"]')).toBeVisible();
});
