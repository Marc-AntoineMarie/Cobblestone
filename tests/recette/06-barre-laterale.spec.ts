import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Cobble } from './lib/cobble';

// 6. La liste des notes : coffre, épinglées, tags, barre d'état.

const withBookmarks = (items: object[]) => baseVault({ '.cobblestone/bookmarks.json': JSON.stringify({ items }) });
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
  await ui.listToggle.click();
  await expect(ui.rail).toHaveCount(0);
  await expect(ui.page.locator('.list-handle')).toBeVisible();
});

recette('6.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.listToggle.click();
  await expect(ui.rail).toHaveCount(0);
  await ui.page.locator('.list-handle').click();
  await expect(ui.rail).toBeVisible();
});

recette('6.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.pins.first().click();
  await expect(ui.title).toHaveValue(today());
  await expect.poll(() => app.exists(`${today()}.md`)).toBe(true);
});

recette('6.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.rail.getByRole('button', { name: 'Graphe' }).click();
  await expect(ui.view.locator('.graph-view')).toBeVisible();
  await expect(ui.activeTab).toContainText('Graphe');
});

recette('6.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await expect(ui.pins).toHaveCount(1);
  await expect(ui.pins.first()).toContainText('Aujourd’hui');
});

recette('6.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Projets/Plan');
  await ui.noteBar.getByRole('button', { name: 'Ajouter aux favoris' }).click();
  const pin = ui.pins.filter({ hasText: 'Plan' });
  await expect(pin).toHaveCount(1);
  await expect(pin).toContainText('Projets');
});

recette('6.9', async ({ app, ui }) => {
  await app.start({ vault: withBookmarks([{ type: 'file', path: 'Étude.md', ctime: 1 }]) });
  await ui.pins.filter({ hasText: 'Étude' }).click();
  await expect(ui.title).toHaveValue('Étude');
  await expect(ui.tabs).toHaveCount(1);
});

recette('6.10', async ({ app, ui }) => {
  await app.start({ vault: withBookmarks([{ type: 'file', path: 'Projets/Plan.md', subpath: '#Suite', ctime: 1 }]) });
  await ui.pins.filter({ hasText: 'Plan' }).click();
  await expect(ui.title).toHaveValue('Plan');
  await expect(ui.editor.locator('.cm-line', { hasText: 'La suite.' })).toBeVisible();
});

recette('6.11', async ({ app, ui }) => {
  await app.start({ vault: withBookmarks([{ type: 'folder', path: 'Projets', ctime: 1 }]) });
  await ui.pins.filter({ hasText: 'Projets' }).click();
  await expect(ui.listTab('Dossiers')).toHaveAttribute('aria-selected', 'true');
  await expect(ui.row('Projets')).toHaveAttribute('aria-expanded', 'true');
});

recette('6.12', async ({ app, ui }) => {
  await app.start({ vault: withBookmarks([{ type: 'search', query: 'tag:#idee', ctime: 1 }]) });
  await ui.pins.filter({ hasText: 'tag:#idee' }).click();
  await expect(ui.find).toHaveValue('tag:#idee');
  await expect(ui.findResults).toContainText('Idées');
});

recette('6.13', async ({ app, ui }) => {
  await app.start({
    vault: withBookmarks([
      { type: 'group', title: 'Travail', ctime: 1, items: [{ type: 'file', path: 'Étude.md', ctime: 2 }] },
      { type: 'file', path: 'Idées.md', ctime: 3 },
    ]),
  });
  await expect(ui.pins.filter({ hasText: 'Étude' })).toHaveCount(1);
  await expect(ui.pins.filter({ hasText: 'Idées' })).toHaveCount(1);
});

recette('6.14', async ({ app, ui }) => {
  await app.start({ vault: withBookmarks([{ type: 'file', path: 'Étude.md', ctime: 1 }]) });
  await ui.pins.filter({ hasText: 'Étude' }).click({ button: 'right' });
  await ui.menuItem('Désépingler').click();
  await expect(ui.pins.filter({ hasText: 'Étude' })).toHaveCount(0);
});

recette('6.15', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await expect(ui.listTab('Récentes')).toHaveAttribute('aria-selected', 'true');
  await ui.listTab('Dossiers').click();
  await expect(ui.rows.first()).toBeVisible();
  await expect(ui.listTab('Dossiers')).toHaveAttribute('aria-selected', 'true');
  await ui.listTab('Tags').click();
  await expect(ui.tags).toBeVisible();
  await expect(ui.rail.locator('.list-rows')).toHaveCount(0);
});

recette('6.16', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.listTab('Tags').click();
  const tags = ui.tags.locator('.list-tag');
  await expect(tags.first()).toContainText('#accueil');
  await expect(tags.filter({ hasText: '#idee' })).toContainText('1');
});

recette('6.17', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.listTab('Tags').click();
  await expect(ui.tags.locator('.list-tag', { hasText: '#projet/alpha' })).toBeVisible();
});

recette('6.18', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.listTab('Tags').click();
  await ui.tags.locator('.list-tag', { hasText: '#idee' }).click();
  await expect(ui.find).toHaveValue('tag:#idee');
  await expect(ui.findResults).toContainText('Idées');
});

recette('6.19', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.listRow('Idées').click({ button: 'right' });
  for (const item of ['Épingler', 'Partager', 'Renommer', 'Déplacer vers…', 'Dupliquer', 'Mettre à la corbeille'])
    await expect(ui.menuItem(item)).toBeVisible();
});

recette('6.20', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Projets/Plan');
  await expect(ui.status).toContainText('mots');
  await expect(ui.status).toContainText('caractères');
  await expect(ui.status).toContainText('rétroliens');
});

recette('6.21', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.rail.getByRole('button', { name: 'Réglages' }).click();
  await expect(ui.view.locator('.settings-view')).toBeVisible();
});

/** Catches what the desktop app asks the system to open. */
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
  const create = ui.rail.getByRole('button', { name: 'Nouvelle note' });
  await create.click();
  await expect(ui.title).toHaveValue('Sans titre');
  await create.click({ button: 'right' });
  for (const item of ['Ouvrir la note du jour', 'Nouveau canvas ici', 'Nouveau dossier']) {
    await expect(ui.menuItem(item)).toBeVisible();
  }
});

recette('6.26', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.listRow('Idées').click();
  await ui.listRow('Étude').click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
});

recette('6.27', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.statusBar.getByRole('button', { name: 'Apparence' }).click();
  const quick = ui.page.getByRole('dialog', { name: 'Apparence' });
  await expect(quick.getByRole('radiogroup', { name: 'Thème' })).toBeVisible();
  await expect(quick.getByRole('group', { name: 'Taille du texte' })).toBeVisible();
  await expect(quick.getByRole('radiogroup', { name: 'Disposition' })).toBeVisible();
  const clipped = await quick
    .locator('.segmented button')
    .evaluateAll((buttons) =>
      buttons.filter((b) => b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent),
    );
  expect(clipped).toEqual([]);
  await ui.page.keyboard.press('Escape');
  await expect(quick).toHaveCount(0);
});

recette('6.28', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), viewport: { width: 900, height: 800 } });
  await expect(ui.rail).toBeVisible();
  const scrim = ui.page.locator('.workbench-body .scrim');
  await expect(scrim).toBeVisible();
  await scrim.click({ position: { x: 700, y: 400 } });
  await expect(ui.rail).toHaveCount(0);
});

recette('6.29', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.statusBar.getByRole('button', { name: 'Apparence' }).click();
  await ui.page.getByRole('dialog', { name: 'Apparence' }).getByRole('radio', { name: 'Concentré' }).click();
  await expect(ui.rail).toHaveCount(0);
  await expect(ui.page.locator('.marge')).toHaveCount(0);
  await ui.page.keyboard.press('Escape');
  await ui.page.keyboard.press('Control+p');
  await ui.palette.locator('input').fill('> Disposition : Complet');
  await ui.page.keyboard.press('Enter');
  await expect(ui.rail).toBeVisible();
  await expect(ui.page.locator('.marge')).toBeVisible();
});
