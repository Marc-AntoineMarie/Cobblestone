import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Ui } from './lib/ui';

// 15. Palette.

const items = (ui: Ui) => ui.palette.locator('.finder-item');
const input = (ui: Ui) => ui.palette.locator('input');

recette('15.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Réunion');
  await ui.open('Étude');
  await ui.page.keyboard.press('Control+k');
  await expect(input(ui)).toHaveAttribute('placeholder', /Chercher une note/);
  await expect(items(ui).nth(0)).toContainText('Étude');
  await expect(items(ui).nth(1)).toContainText('Réunion');
  await ui.page.keyboard.press('Escape');
  await ui.page.keyboard.press('Control+o');
  await expect(items(ui).first()).toContainText('Étude');
});

recette('15.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press('Control+k');
  await input(ui).fill('reunio');
  await expect(items(ui).first()).toContainText('Réunion');
  await input(ui).fill('Projets/Pl');
  await expect(items(ui).first()).toContainText('Plan');
  await input(ui).fill('Recherche');
  await expect(items(ui).filter({ hasText: 'Recherche' }).first()).toContainText('→ Étude');
});

recette('15.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Bienvenue');
  await ui.page.keyboard.press('Control+k');
  await input(ui).fill('e');
  const first = await ui.palette.locator('.finder-item[aria-selected="true"]').textContent();
  await ui.page.keyboard.press('ArrowDown');
  await expect(ui.palette.locator('.finder-item[aria-selected="true"]')).not.toHaveText(first!);
  await input(ui).fill('Réunion');
  await ui.page.keyboard.press('Enter');
  await expect(ui.activeTab).toContainText('Réunion');
  await expect(ui.tabs).toHaveCount(1);
  await ui.page.keyboard.press('Control+k');
  await input(ui).fill('Étude');
  await ui.page.keyboard.press('Control+Enter');
  await expect(ui.tabs).toHaveCount(2);
  await ui.page.keyboard.press('Control+k');
  await input(ui).fill('Idées');
  await items(ui).first().click();
  await expect(ui.activeTab).toContainText('Idées');
});

recette('15.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press('Control+k');
  await input(ui).fill('Liste de courses');
  await expect(items(ui).last()).toHaveText(/Créer la note « Liste de courses »/);
  await ui.page.keyboard.press('Shift+Enter');
  await expect(ui.activeTab).toContainText('Liste de courses');
  await expect.poll(() => app.exists('Liste de courses.md')).toBe(true);
});

recette('15.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press('Control+k');
  await input(ui).fill('Archives/2026/Bilan');
  await ui.page.keyboard.press('Shift+Enter');
  await expect.poll(() => app.exists('Archives/2026/Bilan.md')).toBe(true);
});

recette('15.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press('Control+k');
  await ui.page.keyboard.press('Escape');
  await expect(ui.palette).toHaveCount(0);
  await ui.page.keyboard.press('Control+k');
  await ui.page.locator('.finder-layer').click({ position: { x: 10, y: 10 } });
  await expect(ui.palette).toHaveCount(0);
});

recette('15.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  for (const key of ['Control+p', 'Control+Shift+P']) {
    await ui.page.keyboard.press(key);
    await expect(input(ui)).toHaveValue('> ');
    await expect(items(ui).first().locator('kbd').or(ui.palette.locator('.finder-item kbd').first())).toBeVisible();
    await ui.page.keyboard.press('Escape');
  }
});

recette('15.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press('Control+k');
  await input(ui).fill('>');
  await expect(items(ui).first()).toHaveClass(/is-command/);
  await input(ui).fill('');
  await expect(items(ui).first()).toHaveClass(/is-note/);
});

recette('15.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press('Control+p');
  await input(ui).fill('> commande qui nexiste pas');
  await expect(ui.palette.locator('.finder-empty')).toHaveText('Aucune commande ne correspond.');
});

recette('15.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press('Control+p');
  await input(ui).fill('> corbeille');
  await expect(ui.palette.locator('.finder-empty')).toBeVisible();
  await ui.page.keyboard.press('Escape');
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+p');
  await input(ui).fill('> corbeille');
  await expect(items(ui).first()).toContainText('Mettre cette note à la corbeille');
});

recette('15.11', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press('Control+k');
  const foot = ui.palette.locator('.finder-foot');
  await expect(foot).toContainText('ouvrir');
  await expect(foot).toContainText('nouvel onglet');
  await expect(foot).toContainText('fermer');
  await expect(foot.locator('kbd')).not.toHaveCount(0);
});
