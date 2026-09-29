import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';

recette.ci('1.1', 'npm ci installe les dépendances à chaque push');
recette.manuel('1.2', 'préparer une copie de son propre coffre avant la recette manuelle');

recette('1.3', async ({ app, ui }) => {
  await app.start();
  await expect(ui.launcher).toBeVisible();
  await app.close();
  const reopened = await app.start({ vault: baseVault(), name: 'Mes notes' });
  await expect(reopened.page.locator('.vault-name')).toHaveText('Mes notes');
});

recette.manuel(
  '1.4',
  'lire le terminal de npm run dev:desktop ; les tests automatiques échouent déjà sur toute erreur de la page',
);

recette('1.5', async ({ app, ui }) => {
  await app.start();
  await expect(ui.launcher.getByRole('button', { name: /Ouvrir un dossier/ })).toBeVisible();
});

recette('1.6', async ({ app, ui }) => {
  // Firefox has no File System Access API: the same page without it.
  await app.start({ withoutFolderAccess: true });
  await expect(ui.launcher.getByRole('button', { name: /Ouvrir un dossier/ })).toHaveCount(0);
  await expect(ui.launcher.locator('.launcher-note')).toContainText(/Chrome|Edge|app de bureau/);
});

recette.manuel('1.7', 'construire les installeurs prend plusieurs minutes ; la CI de publication les construit à chaque version');
recette.manuel('1.8', "lancer l'AppImage dans le bureau de l'utilisateur");
recette.manuel('1.9', 'installer le .deb demande les droits administrateur');
recette.ci('1.10', 'npm run check à chaque push');
recette.ci('1.11', 'npm run e2e (cette recette automatique) à chaque push');

recette('1.12', async ({ app, ui }) => {
  // A fresh app data folder: the tests start from one each time.
  await app.start();
  await expect(ui.recentRows).toHaveCount(0);
  await expect(ui.launcher.locator('.launcher-empty')).toBeVisible();
});

recette('1.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Mes notes', preferences: { theme: 'night', language: 'auto' } });
  await expect(ui.page.locator('html')).toHaveAttribute('data-paper', 'night');
  await app.clearSiteData();
  await expect(ui.launcher).toBeVisible();
  await expect(ui.recentRows).toHaveCount(0);
  await expect(ui.page.locator('html')).not.toHaveAttribute('data-paper', 'night');
});
