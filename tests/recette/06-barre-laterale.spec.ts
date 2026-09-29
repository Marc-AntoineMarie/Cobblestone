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
  await ui.rail.getByRole('button', { name: 'Masquer la barre latérale' }).click();
  await expect(ui.rail).toHaveCount(0);
  await expect(ui.pane.locator('.tab-rail')).toBeVisible();
});

recette('6.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.rail.getByRole('button', { name: 'Masquer la barre latérale' }).click();
  await ui.pane.locator('.tab-rail').click();
  await expect(ui.rail).toBeVisible();
});

recette('6.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.rail.getByRole('button', { name: /Aujourd.hui/ }).click();
  await expect(ui.activeTab).toContainText(today());
  await expect.poll(() => app.exists(`${today()}.md`)).toBe(true);
});

recette('6.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.rail.getByRole('button', { name: 'Graphe' }).click();
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
  const foot = ui.rail.locator('.rail-foot');
  await expect(foot.getByRole('status')).toContainText('Sur cet appareil');
  await expect(foot.locator('.press-status svg rect')).toHaveCount(1);
  await expect(foot.getByRole('button', { name: 'Réglages' })).toBeVisible();
});

recette('6.21', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.rail.locator('.rail-foot').getByRole('button', { name: 'Réglages' }).click();
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
