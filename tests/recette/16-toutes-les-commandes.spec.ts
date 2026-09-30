import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 16. Toutes les commandes.

async function onNote(app: Cobble, ui: Ui, name = 'Idées') {
  await app.start({ vault: baseVault() });
  await ui.open(name);
}
const today = () => new Date().toLocaleDateString('sv-SE');

recette('16.1', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.page.keyboard.press('Control+n');
  await expect(ui.activeTab).toContainText('Sans titre');
  await expect(ui.title).toBeFocused();
});

recette('16.2', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.page.keyboard.press('Alt+n');
  await expect(ui.activeTab).toContainText('Sans titre');
  await expect(ui.title).toBeFocused();
});

recette('16.3', async ({ app, ui }) => {
  await onNote(app, ui);
  for (const key of ['Control+k', 'Control+o']) {
    await ui.page.keyboard.press(key);
    await expect(ui.palette.locator('input')).toHaveValue('');
    await ui.page.keyboard.press('Escape');
  }
});

recette('16.4', async ({ app, ui }) => {
  await onNote(app, ui);
  for (const key of ['Control+p', 'Control+Shift+P']) {
    await ui.page.keyboard.press(key);
    await expect(ui.palette.locator('input')).toHaveValue('> ');
    await ui.page.keyboard.press('Escape');
  }
});

recette('16.5', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.page.keyboard.press('Control+Shift+D');
  await expect(ui.activeTab).toContainText(today());
});

recette('16.6', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.page.keyboard.press('Control+e');
  await expect(ui.reading).toBeVisible();
});

recette('16.7', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.command('Afficher la source Markdown');
  await expect(ui.noteBar.getByRole('button', { name: 'Source' })).toBeVisible();
  await ui.command('Afficher la source Markdown');
  await expect(ui.noteBar.getByRole('button', { name: 'Source' })).toHaveCount(0);
});

recette('16.8', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.openInNewTab('Étude');
  await ui.page.keyboard.press('Control+w');
  await expect(ui.tabs).toHaveCount(1);
});

recette('16.9', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.openInNewTab('Étude');
  await ui.page.keyboard.press('Alt+w');
  await expect(ui.tabs).toHaveCount(1);
});

recette('16.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').click();
  await ui.row('Étude.md').click();
  await ui.page.keyboard.press('Control+Alt+ArrowLeft');
  await expect(ui.activeTab).toContainText('Idées');
  await ui.page.keyboard.press('Control+Alt+ArrowRight');
  await expect(ui.activeTab).toContainText('Étude');
});

recette('16.11', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.page.keyboard.press('Control+\\');
  await expect(ui.page.locator('.split.is-row')).toBeVisible();
});

recette('16.12', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.command('Diviser en bas');
  await expect(ui.page.locator('.split.is-column')).toBeVisible();
});

recette('16.13', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.editor.click();
  await ui.page.keyboard.press('Control+Shift+\\');
  await expect(ui.rail).toHaveCount(0);
  await ui.page.keyboard.press('Control+Shift+\\');
  await expect(ui.rail).toBeVisible();
  await ui.editor.click();
  await ui.page.keyboard.press('Control+[');
  await expect(ui.rail).toHaveCount(0);
  await ui.page.keyboard.press('Control+[');
  await expect(ui.rail).toBeVisible();
});

recette('16.14', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.editor.click();
  await ui.page.keyboard.press('Control+]');
  await expect(ui.margin).toHaveCount(0);
  await ui.page.keyboard.press('Control+]');
  await expect(ui.margin).toBeVisible();
});

recette('16.15', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.page.keyboard.press('Control+g');
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.pane.locator('.graph-view')).toBeVisible();
});

recette('16.16', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.command('Ouvrir le graphe autour de cette note');
  await expect(ui.panes).toHaveCount(2);
  await expect(ui.panes.nth(1).locator('.graph-view')).toBeVisible();
});

recette('16.17', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.page.keyboard.press('Control+,');
  await expect(ui.activeTab).toContainText('Réglages');
});

recette('16.18', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.command('Changer de coffre');
  await expect(ui.launcher).toBeVisible();
});

recette('16.19', async ({ app, ui }) => {
  await onNote(app, ui);
  const before = await ui.page.locator('html').getAttribute('data-paper');
  await ui.command('Basculer entre papier de jour et de nuit');
  await expect(ui.page.locator('html')).not.toHaveAttribute('data-paper', before!);
});

recette('16.20', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.page.keyboard.press('F2');
  await expect(ui.title).toBeFocused();
});

recette('16.21', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.command('Mettre cette note à la corbeille');
  await expect.poll(() => app.exists('.trash/Idées.md')).toBe(true);
});

recette('16.22', async ({ app, ui }) => {
  await onNote(app, ui, 'Plan');
  await ui.command('Montrer cette note dans la barre latérale');
  await expect(ui.row('Projets/Plan.md')).toHaveClass(/is-revealed/);
});

recette('16.23', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.command('Copier un lien vers cette note');
  await expect.poll(() => app.clipboard()).toBe('[[Idées]]');
});

recette('16.24', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.command('Ajouter ou retirer cette note des favoris');
  await expect(ui.bookmarks).toContainText('Idées');
  await ui.command('Ajouter ou retirer cette note des favoris');
  await expect(ui.bookmarks).toHaveCount(0);
});

recette('16.25', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.editor.click();
  await ui.page.keyboard.press('Alt+t');
  await expect(ui.palette.locator('.finder-item', { hasText: 'Quotidien' })).toBeVisible();
});

recette('16.26', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.command('Créer un canvas');
  await expect(ui.activeTab).toContainText('Sans titre');
  await expect.poll(() => app.exists('Sans titre.canvas')).toBe(true);
});

recette.manuel('16.27', 'les tests tournent sous Linux : les raccourcis Mac (Cmd, ⌘ ⇧ ⌥) se vérifient sur un Mac');

recette('16.28', async ({ app, ui }) => {
  await onNote(app, ui);
  await app.electron.evaluate(({ shell }) => {
    (globalThis as { __shown?: string[] }).__shown = [];
    shell.showItemInFolder = (path: string) => void (globalThis as { __shown?: string[] }).__shown!.push(path);
  });
  await ui.command('Montrer cette note dans le gestionnaire de fichiers');
  await expect
    .poll(() => app.electron.evaluate(() => (globalThis as { __shown?: string[] }).__shown))
    .toEqual([`${app.root}/Idées.md`]);
});

recette('16.29', async ({ app, ui }) => {
  await onNote(app, ui);
  await ui.page.keyboard.press('Control+p');
  await ui.palette.locator('input').fill('> gestionnaire');
  await expect(ui.palette.locator('.finder-empty')).toBeVisible();
});
