import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 22. Opérations sur les fichiers et liens.

async function renameRow(ui: Ui, path: string, name: string) {
  await ui.expand(path);
  await ui.contextMenu(path, 'Renommer');
  await ui.page.locator('.tree-rename').fill(name);
  await ui.page.locator('.tree-rename').press('Enter');
}

/** A link of a note in reading mode, and whether it resolves. */
async function linkState(app: Cobble, ui: Ui, note: string, text: string) {
  await ui.open(note);
  await ui.mode('Lire');
  const link = ui.reading.locator('a.internal-link', { hasText: text }).first();
  return (await link.getAttribute('class')) ?? '';
}

recette('22.1', async ({ app, ui }) => {
  const sources = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`Source ${i}.md`, `Voir [[Cible]] (${i}).`]));
  await app.start({ vault: baseVault({ 'Cible.md': 'cible', ...sources }) });
  await renameRow(ui, 'Cible.md', 'Cible renommée');
  for (let i = 0; i < 10; i++) await expect.poll(() => app.read(`Source ${i}.md`)).toBe(`Voir [[Cible renommée]] (${i}).`);
});

recette('22.2', async ({ app, ui }) => {
  const text = [
    '[[Cible|alias]]',
    '[[Cible#Titre]]',
    '[[Cible#^bloc]]',
    '![[Cible]]',
    '[md](Cible.md)',
    '| a | [[Cible\\|dans un tableau]] |',
  ].join('\n');
  await app.start({ vault: baseVault({ 'Cible.md': '# Titre\n\nTexte ^bloc', 'Liens.md': text }) });
  await renameRow(ui, 'Cible.md', 'Nouvelle');
  await expect
    .poll(() => app.read('Liens.md'))
    .toBe(
      [
        '[[Nouvelle|alias]]',
        '[[Nouvelle#Titre]]',
        '[[Nouvelle#^bloc]]',
        '![[Nouvelle]]',
        '[md](Nouvelle.md)',
        '| a | [[Nouvelle\\|dans un tableau]] |',
      ].join('\n'),
    );
});

recette('22.3', async ({ app, ui }) => {
  await app.start({
    vault: baseVault({ 'Racine.md': 'Vers [[Cible]].', 'Dossier/Cible.md': 'cible', 'Archives/Final.md': 'autre' }),
  });
  await renameRow(ui, 'Dossier/Cible.md', 'Final');
  // Two notes are named "Final" now: the link carries the folder to stay unambiguous.
  await expect.poll(() => app.read('Racine.md')).toBe('Vers [[Dossier/Final]].');
});

recette('22.4', async ({ app, ui }) => {
  await app.start({
    vault: baseVault({
      'Accueil.md': 'Vers [[Dossier/Une]] et [[Deux]].',
      'Dossier/Une.md': 'Voisine : [Deux](Deux.md) et [[Deux]].',
      'Dossier/Deux.md': 'deux',
    }),
  });
  await ui.contextMenu('Dossier', 'Nouveau dossier ici');
  await ui.page.locator('.tree-rename').press('Escape');
  await renameRow(ui, 'Dossier', 'Classeur');
  await expect.poll(() => app.read('Accueil.md')).toBe('Vers [[Classeur/Une]] et [[Deux]].');
  expect(await app.read('Classeur/Une.md')).toBe('Voisine : [Deux](Deux.md) et [[Deux]].');
  expect(await linkState(app, ui, 'Une', 'Deux')).not.toContain('is-unresolved');
});

recette('22.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-links').click();
  await renameRow(ui, 'Idées.md', 'Pistes');
  await expect.poll(() => app.exists('Pistes.md')).toBe(true);
  expect(await app.read('Bienvenue.md')).toContain('[[Idées]]');
  expect(await linkState(app, ui, 'Bienvenue', 'Idées')).toContain('is-unresolved');
});

recette('22.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Idées.md', 'Mettre à la corbeille');
  await expect.poll(() => app.exists('.trash/Idées.md')).toBe(true);
  expect(await linkState(app, ui, 'Bienvenue', 'Idées')).toContain('is-unresolved');
});

recette('22.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'A/Nom.md': 'un', 'B/Nom.md': 'deux' }) });
  await ui.expand('A/Nom.md');
  await ui.contextMenu('A/Nom.md', 'Mettre à la corbeille');
  await ui.expand('B/Nom.md');
  await ui.contextMenu('B/Nom.md', 'Mettre à la corbeille');
  await expect.poll(() => app.list()).toEqual(expect.arrayContaining(['.trash/Nom.md', '.trash/Nom 1.md']));
});

recette('22.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-trash').selectOption('permanent');
  await ui.contextMenu('Idées.md', 'Mettre à la corbeille');
  await expect.poll(() => app.exists('Idées.md')).toBe(false);
  expect(await app.exists('.trash/Idées.md')).toBe(false);
});

recette('22.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Plan');
  await ui.openInNewTab('Idées');
  await ui.contextMenu('Projets', 'Mettre à la corbeille');
  await expect.poll(() => app.exists('.trash/Projets/Réunion.md')).toBe(true);
  await expect(ui.tab('Plan')).toHaveCount(0);
  await expect(ui.tab('Idées')).toBeVisible();
});

recette('22.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Idées.md', 'Mettre à la corbeille');
  await expect.poll(() => app.exists('.trash/Idées.md')).toBe(true);
  await ui.find.fill('Idées');
  await ui.findResults.locator('.find-hit.is-create').click();
  await expect.poll(() => app.exists('Idées.md')).toBe(true);
  expect(await linkState(app, ui, 'Bienvenue', 'Idées')).not.toContain('is-unresolved');
});

recette('22.11', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Attente.md': 'Bientôt [[Future]].' }) });
  expect(await linkState(app, ui, 'Attente', 'Future')).toContain('is-unresolved');
  await ui.page.keyboard.press('Control+k');
  await ui.palette.locator('input').fill('Future');
  await ui.page.keyboard.press('Shift+Enter');
  await expect.poll(() => app.exists('Future.md')).toBe(true);
  expect(await linkState(app, ui, 'Attente', 'Future')).not.toContain('is-unresolved');
});

recette('22.12', async ({ app, ui }) => {
  const name = "L'été (2026) 🌻 à Zürich";
  await app.start({ vault: baseVault({ 'Index.md': 'Vers [[Idées]].' }) });
  await ui.page.keyboard.press('Control+k');
  await ui.palette.locator('input').fill(name);
  await ui.page.keyboard.press('Shift+Enter');
  await expect.poll(() => app.exists(`${name}.md`)).toBe(true);
  await renameRow(ui, 'Idées.md', `Idées d'${name}`);
  await expect.poll(() => app.read('Index.md')).toBe(`Vers [[Idées d'${name}]].`);
  expect(await linkState(app, ui, 'Index', `Idées d'${name}`)).not.toContain('is-unresolved');
});

recette('22.13', async ({ app, ui }) => {
  await app.start({
    vault: baseVault({
      'Haut/Nom.md': 'en haut',
      'Fond/Profond/Nom.md': 'au fond',
      'Autre/Depuis.md': 'Lien [[Nom]].',
      'Fond/Profond/Voisin.md': 'Lien [[Nom]].',
    }),
  });
  await ui.open('Depuis');
  await ui.mode('Lire');
  await ui.reading.locator('a.internal-link').click();
  await expect(ui.pane.locator('.note-crumbs')).toContainText('Haut');
  await ui.open('Voisin');
  await ui.mode('Lire');
  await ui.reading.locator('a.internal-link').click();
  await expect(ui.pane.locator('.note-crumbs')).toContainText('Profond');
});
