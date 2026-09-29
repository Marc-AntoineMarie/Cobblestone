import { expect, recette } from './lib/recette';
import { baseVault, manyNotes } from './lib/vaults';

// 4. Barre latérale : champ de recherche.

const hits = (ui: { findResults: import('@playwright/test').Locator }) => ui.findResults.locator('.find-hit');
const selected = (ui: { findResults: import('@playwright/test').Locator }) =>
  ui.findResults.locator('.find-hit[aria-selected="true"]');

recette('4.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('bnvnu');
  await expect(ui.findResults.locator('.find-group').first()).toHaveText('Noms');
  const hit = ui.findResults.locator('.find-hit.is-name', { hasText: 'Bienvenue' });
  await expect(hit).toBeVisible();
  await expect(hit.locator('mark')).not.toHaveCount(0);
});

recette('4.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('etude');
  await expect(ui.findResults.locator('.find-hit.is-name', { hasText: 'Étude' })).toBeVisible();
});

recette('4.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('dentaire');
  await expect(ui.findResults.locator('.find-group', { hasText: 'Dans le texte' })).toHaveCount(0);
  await ui.find.fill('relit');
  const group = ui.findResults.locator('.find-group', { hasText: 'Dans le texte' });
  await expect(group.locator('.find-count')).toHaveText('1');
  await expect(ui.findResults.locator('.find-hit.is-text .find-snippet mark')).toHaveText('relit');
});

recette('4.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('Rendez-vous chez le dentiste');
  for (let i = 0; i < 10 && !(await ui.findResults.locator('.find-hit.is-create[aria-selected="true"]').count()); i++) {
    await ui.find.press('ArrowDown');
  }
  await expect(ui.findResults.locator('.find-hit.is-create[aria-selected="true"]')).toContainText('Rendez-vous chez le dentiste');
  await ui.find.press('Enter');
  await expect(ui.activeTab).toContainText('Rendez-vous chez le dentiste');
  await expect.poll(() => app.exists('Rendez-vous chez le dentiste.md')).toBe(true);
});

recette('4.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('e');
  const first = await selected(ui).textContent();
  await ui.find.press('ArrowDown');
  await expect(selected(ui)).not.toHaveText(first!);
  await ui.find.press('ArrowUp');
  await expect(selected(ui)).toHaveText(first!);
});

recette('4.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('Réunion');
  await ui.find.press('Enter');
  await expect(ui.activeTab).toContainText('Réunion');
  await expect(ui.tabs).toHaveCount(1);
  await expect(ui.find).toHaveValue('');
});

recette('4.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.find.fill('Réunion');
  await ui.find.press('Control+Enter');
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.activeTab).toContainText('Réunion');
});

recette('4.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.find.fill('Réunion');
  await ui.findResults.locator('.find-hit.is-name', { hasText: 'Réunion' }).click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
});

recette('4.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('plan');
  await ui.find.press('Escape');
  await expect(ui.find).toHaveValue('');
  await expect(ui.find).not.toBeFocused();
  await expect(ui.row('Bienvenue.md')).toBeVisible();
});

recette('4.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('plan');
  await ui.rail.locator('.rail-find-clear').click();
  await expect(ui.find).toHaveValue('');
});

recette('4.11', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('tag:#projet');
  await expect(ui.findResults.locator('.find-group')).toHaveCount(1);
  await expect(ui.findResults.locator('.find-group')).toContainText('Dans le texte');
  await expect(hits(ui)).toHaveText([/Plan/, /Réunion/]);
  await ui.find.fill('path:Journal');
  await expect(hits(ui)).toHaveText([/2026-09-29/]);
});

recette('4.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.find.fill('/Bienv');
  await expect(ui.findResults.locator('.find-hit.is-name', { hasText: 'Bienvenue' })).toBeVisible();
  await expect(ui.findResults.locator('.find-group')).toHaveCount(1);
});

recette('4.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  for (const name of ['a/b', 'Nom#x']) {
    await ui.find.fill(name);
    await ui.page.waitForTimeout(150);
    await expect(ui.findResults.locator('.find-create')).toHaveCount(0);
  }
});

recette('4.14', async ({ app, ui }) => {
  await app.start({ vault: manyNotes(3000), name: 'Gros coffre' });
  await ui.find.click();
  const start = Date.now();
  await ui.page.keyboard.type('Note 1234', { delay: 20 });
  const typing = Date.now() - start;
  await expect(ui.find).toHaveValue('Note 1234');
  await expect(ui.findResults.locator('.find-hit.is-name').first()).toContainText('Note 1234');
  // 9 keys, 20 ms apart: typing must not wait on the search.
  expect(typing).toBeLessThan(2500);
});
