import { expect, recette } from './lib/recette';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 18. Recherche avancée, dans le champ de la barre latérale.

const SEARCH_VAULT = {
  'Pommes.md': 'Des pommes et des poires.\n',
  'Poires.md': 'Seulement des poires.\n',
  'Jardin.md': 'Le jardin fleuri.\n\nAvec des pommes au fond.\n',
  'Dates.md': 'Rendez-vous le 2026-09 et puis rien.\n',
  'Mot dans le titre.md': 'rien de spécial\n',
  'Projets/Alpha.md': '---\nstatut: actif\ntags: [projet/alpha]\n---\nUn projet.\n',
  'Projets/Beta.md': '---\nstatut: [actif, suspendu]\n---\n#projet en pause.\n',
  'Journal/Lundi.md': '# Matin\n\nCafé et croissant\n\n# Soir\n\nThé\n\n- [ ] acheter du café\n- [x] payer le thé\n',
  'Casse.md': 'Le Mot important et le mot banal.\n',
};

async function search(app: Cobble, ui: Ui, query: string) {
  if (!app.page) await app.start({ vault: SEARCH_VAULT });
  await ui.find.fill(query);
  await ui.page.waitForTimeout(250);
}
/** Names of the notes found in their text (the "Dans le texte" section). */
const found = (ui: Ui) =>
  ui.findResults
    .locator('.find-hit.is-text .find-name')
    .allTextContents()
    .then((names) => names.sort());

recette('18.1', async ({ app, ui }) => {
  await search(app, ui, 'pommes poires');
  expect(await found(ui)).toEqual(['Pommes']);
});

recette('18.2', async ({ app, ui }) => {
  await search(app, ui, 'fleuri OR Seulement');
  expect(await found(ui)).toEqual(['Jardin', 'Poires']);
});

recette('18.3', async ({ app, ui }) => {
  await search(app, ui, 'poires -pommes');
  expect(await found(ui)).toEqual(['Poires']);
});

recette('18.4', async ({ app, ui }) => {
  await search(app, ui, '"des pommes et"');
  expect(await found(ui)).toEqual(['Pommes']);
});

recette('18.5', async ({ app, ui }) => {
  await search(app, ui, '/\\d{4}-\\d{2}/');
  expect(await found(ui)).toEqual(['Dates']);
});

recette('18.6', async ({ app, ui }) => {
  await search(app, ui, 'file:titre');
  expect(await found(ui)).toEqual(['Mot dans le titre']);
});

recette('18.7', async ({ app, ui }) => {
  await search(app, ui, 'path:Projets');
  expect(await found(ui)).toEqual(['Alpha', 'Beta']);
});

recette('18.8', async ({ app, ui }) => {
  await search(app, ui, 'content:titre');
  expect(await found(ui)).toEqual([]);
  await search(app, ui, 'content:fleuri');
  expect(await found(ui)).toEqual(['Jardin']);
});

recette('18.9', async ({ app, ui }) => {
  await search(app, ui, 'tag:#projet');
  expect(await found(ui)).toEqual(['Alpha', 'Beta']);
});

recette('18.10', async ({ app, ui }) => {
  await search(app, ui, 'line:(café croissant)');
  expect(await found(ui)).toEqual(['Lundi']);
  await search(app, ui, 'line:(café thé)');
  expect(await found(ui)).toEqual([]);
});

recette('18.11', async ({ app, ui }) => {
  await search(app, ui, 'block:(jardin fleuri)');
  expect(await found(ui)).toEqual(['Jardin']);
  await search(app, ui, 'block:(fleuri pommes)');
  expect(await found(ui)).toEqual([]);
});

recette('18.12', async ({ app, ui }) => {
  await search(app, ui, 'section:(café croissant)');
  expect(await found(ui)).toEqual(['Lundi']);
  await search(app, ui, 'section:(croissant thé)');
  expect(await found(ui)).toEqual([]);
});

recette('18.13', async ({ app, ui }) => {
  await search(app, ui, 'task:café');
  expect(await found(ui)).toEqual(['Lundi']);
  await search(app, ui, 'task-todo:thé');
  expect(await found(ui)).toEqual([]);
  await search(app, ui, 'task-done:thé');
  expect(await found(ui)).toEqual(['Lundi']);
});

recette('18.14', async ({ app, ui }) => {
  // As in Obsidian, a plain word also matches file names: "Mot dans le titre".
  await search(app, ui, 'match-case:Mot');
  expect(await found(ui)).toEqual(['Casse', 'Mot dans le titre']);
  await search(app, ui, 'match-case:banal');
  expect(await found(ui)).toEqual(['Casse']);
  await search(app, ui, 'match-case:BANAL');
  expect(await found(ui)).toEqual([]);

  await search(app, ui, 'ignore-case:BANAL');
  expect(await found(ui)).toEqual(['Casse']);
});

recette('18.15', async ({ app, ui }) => {
  await search(app, ui, '[statut]');
  expect(await found(ui)).toEqual(['Alpha', 'Beta']);
  await search(app, ui, '[statut:suspendu]');
  expect(await found(ui)).toEqual(['Beta']);
});

recette('18.16', async ({ app, ui }) => {
  await search(app, ui, 'path:(Projets OR Journal) tag:#projet');
  expect(await found(ui)).toEqual(['Alpha', 'Beta']);
  await search(app, ui, 'path:(Journal OR Casse) café');
  expect(await found(ui)).toEqual(['Lundi']);
});

recette('18.17', async ({ app, ui }) => {
  await search(app, ui, 'croissant');
  const hit = ui.findResults.locator('.find-hit.is-text').first();
  await expect(hit.locator('.find-snippet mark')).toHaveText('croissant');
  await expect(hit.locator('.find-folder')).toHaveText('Journal');
});
