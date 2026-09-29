import type { Locator } from '@playwright/test';
import { expect, recette } from './lib/recette';
import { baseVault, manyNotes, PNG } from './lib/vaults';
import type { Ui } from './lib/ui';

// 5. Arborescence des fichiers.

const media = () =>
  baseVault({
    'Projets/Archive/Vieux.md': 'ancien',
    'docs/manuel.pdf': '%PDF-1.4\n%%EOF\n',
    'docs/son.mp3': new Uint8Array([0x49, 0x44, 0x33]),
    'docs/film.mp4': new Uint8Array([0, 0, 0, 0x18]),
    'docs/archive.zip': new Uint8Array([0x50, 0x4b, 3, 4]),
  });

/** The path of the element that has the keyboard focus. */
const focusedPath = (ui: Ui) => ui.page.evaluate(() => document.activeElement?.getAttribute('data-path'));

/** Drags one element onto another with the mouse, checking something while hovering. */
async function drag(ui: Ui, from: Locator, to: Locator, whileOver?: () => Promise<void>, position?: { x: number; y: number }) {
  await from.hover();
  await ui.page.mouse.down();
  const box = (await to.boundingBox())!;
  const x = box.x + (position?.x ?? box.width / 2);
  const y = box.y + (position?.y ?? box.height / 2);
  await ui.page.mouse.move(x, y, { steps: 5 });
  await ui.page.mouse.move(x + 1, y + 1);
  await whileOver?.();
  await ui.page.mouse.up();
}

recette('5.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const folder = ui.row('Projets');
  await folder.click();
  await expect(folder).toHaveAttribute('aria-expanded', 'true');
  await expect(folder.locator('.tree-chevron svg')).toHaveClass(/is-open/);
  await expect(ui.row('Projets/Plan.md')).toBeVisible();
  await folder.click();
  await expect(folder).toHaveAttribute('aria-expanded', 'false');
  await expect(ui.row('Projets/Plan.md')).toHaveCount(0);
});

recette('5.2', async ({ app, ui }) => {
  await app.start({ vault: media() });
  await expect(ui.row('Projets').locator('.tree-count')).toHaveText('3');
  await expect(ui.row('Journal').locator('.tree-count')).toHaveText('1');
});

recette('5.3', async ({ app, ui }) => {
  await app.start({ vault: media() });
  await ui.expand('docs/manuel.pdf');
  await ui.expand('assets/image.png');
  await expect(ui.row('assets/image.png').locator('.tree-ext')).toHaveText('png');
  await expect(ui.row('docs/manuel.pdf').locator('.tree-ext')).toHaveText('pdf');
  await expect(ui.row('Bienvenue.md').locator('.tree-name')).toHaveText('Bienvenue');
  await expect(ui.row('Bienvenue.md').locator('.tree-ext')).toHaveCount(0);
  await expect(ui.row('Tableau.canvas').locator('.tree-name')).toHaveText('Tableau');
});

recette('5.4', async ({ app, ui }) => {
  await app.start({ vault: media() });
  await ui.expand('docs/manuel.pdf');
  await ui.expand('assets/image.png');
  const icon = (path: string) => ui.row(path).locator('.tree-icon').getAttribute('class');
  const icons = await Promise.all(
    [
      'Bienvenue.md',
      'assets/image.png',
      'docs/son.mp3',
      'docs/film.mp4',
      'docs/manuel.pdf',
      'Tableau.canvas',
      'docs/archive.zip',
    ].map(icon),
  );
  expect(new Set(icons).size).toBe(icons.length);
});

recette('5.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').click();
  await expect(ui.activeTab).toContainText('Idées');
  await expect(ui.tabs).toHaveCount(1);
  await expect(ui.row('Idées.md')).toHaveAttribute('aria-selected', 'true');
  const background = await ui.row('Idées.md').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
});

recette('5.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').click();
  await ui.row('Étude.md').click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.activeTab).toContainText('Étude');
});

recette('5.7', async ({ app, ui }) => {
  await app.start({ vault: media() });
  await ui.expand('Projets/Archive/Vieux.md');
  await expect(ui.row('Projets/Plan.md').locator('.tree-guide')).toHaveCount(1);
  await expect(ui.row('Projets/Archive/Vieux.md').locator('.tree-guide')).toHaveCount(2);
});

recette('5.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Bienvenue.md').click();
  await ui.row('Bienvenue.md').focus();
  await ui.page.keyboard.press('ArrowDown');
  await expect.poll(() => focusedPath(ui)).toBe('Étude.md');
  await ui.page.keyboard.press('ArrowUp');
  await expect.poll(() => focusedPath(ui)).toBe('Bienvenue.md');
});

recette('5.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Projets').focus();
  await ui.page.keyboard.press('ArrowRight');
  await expect(ui.row('Projets')).toHaveAttribute('aria-expanded', 'true');
  await ui.page.keyboard.press('ArrowRight');
  await expect.poll(() => focusedPath(ui)).toBe('Projets/Plan.md');
});

recette('5.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.expand('Projets/Plan.md');
  await ui.row('Projets/Plan.md').focus();
  await ui.page.keyboard.press('ArrowLeft');
  await expect.poll(() => focusedPath(ui)).toBe('Projets');
  await ui.page.keyboard.press('ArrowLeft');
  await expect(ui.row('Projets')).toHaveAttribute('aria-expanded', 'false');
});

recette('5.11', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').focus();
  await ui.page.keyboard.press('Enter');
  await expect(ui.activeTab).toContainText('Idées');
  await ui.row('Projets').focus();
  await ui.page.keyboard.press('Enter');
  await expect(ui.row('Projets')).toHaveAttribute('aria-expanded', 'true');
  await ui.row('Étude.md').focus();
  await ui.page.keyboard.press('Control+Enter');
  await expect(ui.tabs).toHaveCount(2);
});

recette('5.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').focus();
  await ui.page.keyboard.press('F2');
  await expect(ui.row('Idées.md').locator('.tree-rename')).toBeFocused();
  await expect(ui.row('Idées.md').locator('.tree-rename')).toHaveValue('Idées');
});

recette('5.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').focus();
  await ui.page.keyboard.press('Delete');
  await expect(ui.row('Idées.md')).toHaveCount(0);
  await expect.poll(() => app.exists('.trash/Idées.md')).toBe(true);
});

recette('5.14', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Projets');
  const labels = await ui.menu.getByRole('menuitem').allTextContents();
  const expected = [
    'Nouvelle note ici',
    'Nouveau dossier ici',
    'Nouveau canvas ici',
    'Ajouter aux favoris',
    'Renommer',
    'Mettre à la corbeille',
  ];
  expect(labels.filter((l) => expected.includes(l))).toEqual(expected);
});

recette('5.15', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Idées.md');
  const labels = await ui.menu.getByRole('menuitem').allTextContents();
  const expected = [
    'Ouvrir dans un nouvel onglet',
    'Ouvrir à droite',
    'Dupliquer',
    'Ajouter aux favoris',
    'Renommer',
    'Mettre à la corbeille',
  ];
  expect(labels.filter((l) => expected.includes(l))).toEqual(expected);
  await expect(ui.menuItem('Mettre à la corbeille')).toHaveClass(/is-danger/);
});

recette('5.16', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Idées.md');
  await expect(ui.menu.getByRole('menuitem').first()).toBeFocused();
  await ui.page.keyboard.press('ArrowDown');
  await expect(ui.menuItem('Ouvrir à droite')).toBeFocused();
  await ui.page.keyboard.press('ArrowUp');
  await ui.page.keyboard.press('Enter');
  await expect(ui.menu).toHaveCount(0);
  await expect(ui.tabs).toHaveCount(2);
  await ui.contextMenu('Idées.md');
  await ui.page.keyboard.press('Escape');
  await expect(ui.menu).toHaveCount(0);
  await ui.contextMenu('Idées.md');
  await ui.page.mouse.click(700, 500);
  await expect(ui.menu).toHaveCount(0);
});

recette('5.17', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), viewport: { width: 900, height: 600 } });
  // A right click at the very corner of the window.
  await ui.row('Tableau.canvas').dispatchEvent('contextmenu', { clientX: 897, clientY: 597, button: 2 });
  const menu = (await ui.menu.boundingBox())!;
  const size = await ui.page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  expect(menu.x + menu.width).toBeLessThanOrEqual(size.width);
  expect(menu.y + menu.height).toBeLessThanOrEqual(size.height);
});

recette('5.18', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Projets', 'Nouvelle note ici');
  await expect(ui.activeTab).toContainText('Sans titre');
  await expect.poll(() => app.exists('Projets/Sans titre.md')).toBe(true);
  await expect(ui.title).toBeFocused();
  expect(await ui.title.evaluate((el: HTMLTextAreaElement) => el.value.slice(el.selectionStart, el.selectionEnd))).toBe(
    'Sans titre',
  );
});

recette('5.19', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  for (let i = 0; i < 3; i++) {
    await ui.contextMenu('Projets', 'Nouvelle note ici');
    await ui.page.keyboard.press('Escape');
  }
  await expect
    .poll(() => app.list())
    .toEqual(expect.arrayContaining(['Projets/Sans titre.md', 'Projets/Sans titre 1.md', 'Projets/Sans titre 2.md']));
});

recette('5.20', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Projets', 'Nouveau dossier ici');
  await expect(ui.row('Projets')).toHaveAttribute('aria-expanded', 'true');
  await expect(ui.row('Projets/Nouveau dossier').locator('.tree-rename')).toBeFocused();
  await expect.poll(() => app.exists('Projets/Nouveau dossier')).toBe(true);
});

recette('5.21', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Bienvenue.md').click();
  await ui.contextMenu('Idées.md', 'Ouvrir à droite');
  await expect(ui.panes).toHaveCount(2);
  await expect(ui.panes.nth(1).locator('.tab.is-active')).toContainText('Idées');
});

recette('5.22', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Idées.md', 'Dupliquer');
  await expect(ui.activeTab).toContainText('Idées 1');
  await expect.poll(() => app.readOr('Idées 1.md')).toBe(await app.read('Idées.md'));
});

recette('5.23', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.expand('assets/image.png');
  await ui.contextMenu('assets/image.png', 'Dupliquer');
  await expect.poll(() => app.exists('assets/image 1.png')).toBe(true);
  expect(Buffer.from(await app.readBytes('assets/image 1.png')).equals(Buffer.from(PNG))).toBe(true);
});

async function renameInPlace(ui: Ui, path: string, name: string) {
  await ui.contextMenu(path, 'Renommer');
  const field = ui.page.locator('.tree-rename');
  await field.fill(name);
  return field;
}

recette('5.24', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.expand('assets/image.png');
  await (await renameInPlace(ui, 'Idées.md', 'Pistes')).press('Enter');
  await expect.poll(() => app.exists('Pistes.md')).toBe(true);
  await expect.poll(() => app.read('Bienvenue.md')).toContain('[[Pistes]]');
  await (await renameInPlace(ui, 'assets/image.png', 'photo')).press('Enter');
  await expect.poll(() => app.exists('assets/photo.png')).toBe(true);
});

recette('5.25', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await (await renameInPlace(ui, 'Idées.md', 'Pistes')).press('Escape');
  await expect(ui.row('Idées.md')).toBeVisible();
  expect(await app.exists('Pistes.md')).toBe(false);
});

recette('5.26', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await renameInPlace(ui, 'Idées.md', 'Pistes');
  await ui.page.mouse.click(700, 500);
  await expect.poll(() => app.exists('Pistes.md')).toBe(true);
});

recette('5.27', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await (await renameInPlace(ui, 'Idées.md', 'a:b')).press('Enter');
  await expect(ui.toasts.filter({ hasText: 'Les noms ne peuvent pas contenir' })).toHaveClass(/is-error/);
  await expect(ui.row('Idées.md')).toBeVisible();
});

recette('5.28', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await (await renameInPlace(ui, 'Idées.md', 'Étude')).press('Enter');
  await expect(ui.toasts.filter({ hasText: 'Un fichier nommé « Étude.md » existe déjà ici' })).toHaveClass(/is-error/);
  await expect(ui.row('Idées.md')).toBeVisible();
  expect(await app.read('Étude.md')).toContain('# Étude');
});

recette('5.29', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await (await renameInPlace(ui, 'Idées.md', 'IDÉES')).press('Enter');
  await expect.poll(() => app.exists('IDÉES.md')).toBe(true);
  await expect.poll(() => app.read('Bienvenue.md')).toContain('[[IDÉES]]');
});

recette('5.30', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await drag(ui, ui.row('Idées.md'), ui.row('Journal'), async () => {
    await expect(ui.row('Journal')).toHaveClass(/is-drop-target/);
  });
  await expect.poll(() => app.exists('Journal/Idées.md')).toBe(true);
  await ui.open('Bienvenue');
  await ui.mode('Lire');
  await ui.reading.getByText('Idées').click();
  await expect(ui.activeTab).toContainText('Idées');
});

recette('5.31', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await drag(ui, ui.row('Projets'), ui.row('Journal'));
  await expect.poll(() => app.exists('Journal/Projets/Plan.md')).toBe(true);
  expect(await app.exists('Journal/Projets/Réunion.md')).toBe(true);
});

recette('5.32', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.expand('Projets/Plan.md');
  const tree = ui.page.locator('.tree');
  const box = (await tree.boundingBox())!;
  await drag(ui, ui.row('Projets/Plan.md'), tree, undefined, { x: box.width / 2, y: box.height - 10 });
  await expect.poll(() => app.exists('Plan.md')).toBe(true);
});

recette('5.33', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Projets/Archive/Vieux.md': 'ancien' }) });
  await ui.expand('Projets/Archive/Vieux.md');
  await drag(ui, ui.row('Projets'), ui.row('Projets/Archive'));
  await ui.page.waitForTimeout(400);
  expect(await app.exists('Projets/Plan.md')).toBe(true);
  expect(await app.exists('Projets/Archive/Projets')).toBe(false);
});

recette('5.34', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.expand('Projets/Plan.md');
  await drag(ui, ui.row('Projets/Plan.md'), ui.row('Projets/Réunion.md'));
  await ui.page.waitForTimeout(400);
  expect(await app.exists('Projets/Plan.md')).toBe(true);
  await expect(ui.toasts).toHaveCount(0);
});

recette('5.35', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Bienvenue');
  await ui.editEnd();
  const line = ui.editor.locator('.cm-line').last();
  await drag(ui, ui.row('Étude.md'), line);
  await expect.poll(() => app.read('Bienvenue.md')).toContain('[[Étude]]');
});

recette('5.36', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Bienvenue');
  await drag(ui, ui.row('Étude.md'), ui.pane.locator('.tabs'));
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.activeTab).toContainText('Étude');
});

recette('5.37', async ({ app, ui }) => {
  await app.start({ vault: manyNotes(3000, 1000), name: 'Gros coffre' });
  // From the bottom up: opening a folder pushes down only the folders below it.
  for (let i = 2; i >= 0; i--) await ui.row(`Dossier ${i}`).click();
  const tree = ui.page.locator('.tree');
  // Only the rows in view are drawn: thousands of rows stay light.
  expect(await ui.rows.count()).toBeLessThan(150);
  const start = Date.now();
  await tree.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(ui.row('Dossier 2/Note 2999.md')).toBeVisible();
  expect(Date.now() - start).toBeLessThan(1500);
});

recette('5.38', async ({ app, ui }) => {
  await app.start({ vault: { '.cobblestone/app.json': '{}' } });
  await expect(ui.page.locator('.tree-empty')).toContainText('Ce coffre est vide');
  await ui.page.locator('.tree-empty').getByRole('button', { name: 'Nouvelle note' }).click();
  await expect(ui.activeTab).toContainText('Sans titre');
});

recette('5.39', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.rail.getByRole('button', { name: 'Nouvelle note' }).click();
  await expect.poll(() => app.exists('Sans titre.md')).toBe(true);
  await ui.rail.getByRole('button', { name: 'Nouveau dossier' }).click();
  await expect.poll(() => app.exists('Nouveau dossier')).toBe(true);
  await ui.page.keyboard.press('Escape');
  const settings = await ui.settings();
  await settings.locator('#set-newfolder').selectOption('folder:Journal');
  await ui.rail.getByRole('button', { name: 'Nouvelle note' }).click();
  await expect.poll(() => app.exists('Journal/Sans titre.md')).toBe(true);
});

recette('5.40', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Plan');
  await ui.editEnd();
  await ui.command('Montrer cette note dans la barre latérale');
  await expect(ui.row('Projets')).toHaveAttribute('aria-expanded', 'true');
  await expect(ui.row('Projets/Plan.md')).toHaveClass(/is-revealed/);
  await expect(ui.row('Projets/Plan.md')).toBeInViewport();
});

/** Desktop: records what the app asks the file manager to show. */
async function recordReveals(app: import('./lib/cobble').Cobble) {
  await app.electron.evaluate(({ shell }) => {
    const calls: string[] = [];
    (globalThis as { __reveals?: string[] }).__reveals = calls;
    shell.showItemInFolder = (path: string) => void calls.push(`show:${path}`);
    shell.openPath = async (path: string) => {
      calls.push(`open:${path}`);
      return '';
    };
  });
  return () => app.electron.evaluate(() => (globalThis as { __reveals?: string[] }).__reveals ?? []);
}

recette('5.41', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const reveals = await recordReveals(app);
  await ui.contextMenu('Idées.md', 'Afficher dans le gestionnaire de fichiers');
  await expect.poll(reveals).toEqual([`show:${app.root}/Idées.md`]);
});

recette('5.42', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const reveals = await recordReveals(app);
  await ui.contextMenu('Projets', 'Afficher dans le gestionnaire de fichiers');
  await expect.poll(reveals).toEqual([`show:${app.root}/Projets`]);
});

recette('5.43', async ({ app, ui }) => {
  await app.start({ vault: media() });
  const reveals = await recordReveals(app);
  await ui.expand('docs/manuel.pdf');
  await ui.expand('assets/image.png');
  for (const path of ['Tableau.canvas', 'assets/image.png', 'docs/manuel.pdf']) {
    await ui.contextMenu(path, 'Afficher dans le gestionnaire de fichiers');
  }
  await expect
    .poll(reveals)
    .toEqual([`show:${app.root}/Tableau.canvas`, `show:${app.root}/assets/image.png`, `show:${app.root}/docs/manuel.pdf`]);
});

recette('5.44', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  for (const path of ['Idées.md', 'Projets']) {
    await ui.contextMenu(path);
    await expect(ui.menu).not.toContainText('gestionnaire de fichiers');
    await ui.page.keyboard.press('Escape');
  }
});
