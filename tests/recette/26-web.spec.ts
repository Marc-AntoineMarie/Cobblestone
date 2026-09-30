import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';

// 26. Spécifique à l'app web.

recette('26.1', async ({ app, ui }) => {
  await app.start();
  await app.pickFolderWith('Dossier réel', baseVault());
  await ui.launchAction(/Ouvrir un dossier/).click();
  await ui.open('Idées');
  await ui.append('\nÉcrit depuis le web');
  await expect.poll(() => app.read('Idées.md')).toContain('Écrit depuis le web');
});

recette.manuel('26.2', 'Firefox n’est pas installé pour les tests automatiques ; son stockage se vérifie à la main');

recette('26.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.pane.locator('.tab-new').click();
  await expect(ui.view.locator('.empty-actions button', { hasText: 'Créer une note' }).locator('kbd')).toHaveText(/Alt/);
  await ui.page.keyboard.press('Control+p');
  await ui.palette.locator('input').fill('> fermer l');
  await expect(ui.palette.locator('.finder-item', { hasText: 'Fermer l’onglet' }).locator('kbd')).toHaveText(/Alt/);
});

recette.manuel(
  '26.4',
  'Firefox n’est pas installé pour les tests automatiques ; Alt+T y ouvre le menu Outils si rien ne l’empêche',
);

recette('26.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.evaluate(() => {
    (window as { __prevented?: string[] }).__prevented = [];
    window.addEventListener(
      'keydown',
      (e) => e.defaultPrevented && (window as { __prevented?: string[] }).__prevented!.push(e.key),
    );
  });
  for (const key of ['p', 'o', 'g', 'k']) {
    await ui.page.keyboard.press(`Control+${key}`);
    await ui.page.keyboard.press('Escape');
  }
  expect(await ui.page.evaluate(() => (window as { __prevented?: string[] }).__prevented)).toEqual(['p', 'o', 'g', 'k']);
});

recette('26.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Essai.md': '' }) });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.type('Tapé avant de fermer l’onglet');
  // The browser tab closes; a new one opens the app again.
  const context = ui.page.context();
  await ui.page.close({ runBeforeUnload: true });
  app.page = await context.newPage();
  await app.page.goto('http://localhost:5199');
  await expect(app.page.locator('.vault-name')).toBeVisible();
  await expect.poll(() => app.read('Essai.md')).toBe('Tapé avant de fermer l’onglet');
});

recette('26.7', async ({ app, ui }) => {
  await app.start();
  await app.pickFolderWith('Dossier réel', baseVault());
  await ui.launchAction(/Ouvrir un dossier/).click();
  await ui.open('Idées');
  await app.write('Idées.md', 'Changé par un autre programme');
  await expect(ui.editor).toContainText('Changé par un autre programme', { timeout: 10_000 });
});

recette('26.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Éphémère' });
  await expect(ui.vaultName).toHaveText('Éphémère');
  // A private window's storage dies with it: a fresh context stands for the next window.
  const browser = ui.page.context().browser()!;
  const fresh = await browser.newContext({ locale: 'fr-FR' });
  const page = await fresh.newPage();
  await page.goto('http://localhost:5199');
  await expect(page.locator('.launcher')).toBeVisible();
  await expect(page.locator('.recent-row')).toHaveCount(0);
  await fresh.close();
});

recette.manuel('26.9', 'limite connue et documentée, sans résultat attendu à vérifier');
