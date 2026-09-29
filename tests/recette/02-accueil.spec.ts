import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { cp, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { expect, recette } from './lib/recette';
import { baseVault, manyNotes } from './lib/vaults';

const openFolder = /Ouvrir un dossier/;
const newVault = /Nouveau coffre/;

recette('2.1', async ({ app, ui }) => {
  await app.start();
  await expect(ui.launcher.getByRole('heading', { name: 'Cobblestone' })).toBeVisible();
  await expect(ui.launcher.locator('.launcher-tagline')).toBeVisible();
  await expect(ui.launcher.locator('.launch-action')).toHaveCount(3);
  await expect(ui.launcher.locator('.launcher-empty')).toBeVisible();
});

recette('2.2', async ({ app, ui }) => {
  await app.start();
  await app.answerFolderDialog(null);
  await ui.launchAction(openFolder).click();
  await expect.poll(() => app.folderDialogs()).toBe(1);
});

recette('2.3', async ({ app, ui }) => {
  await app.start();
  await app.answerFolderDialog(null);
  await ui.launchAction(openFolder).click();
  await expect.poll(() => app.folderDialogs()).toBe(1);
  await expect(ui.launcher).toBeVisible();
  await expect(ui.launcherStatus).toHaveCount(0);
  await expect(ui.recentRows).toHaveCount(0);
});

recette('2.4', async ({ app, ui }) => {
  await app.start();
  const folder = await app.folder('Copie du coffre', baseVault());
  await app.answerFolderDialog(folder);
  await ui.launchAction(openFolder).click();
  await expect(ui.vaultName).toHaveText('Copie du coffre');
  await ui.switchVault();
  await expect(ui.recent('Copie du coffre').locator('.recent-where')).toContainText(folder);
});

recette('2.5', async ({ app, ui }) => {
  await app.start();
  await app.pickFolderWith('Copie du coffre', baseVault());
  await ui.launchAction(openFolder).click();
  await expect(ui.vaultName).toHaveText('Copie du coffre');
  await expect(ui.row('Bienvenue.md')).toBeVisible();
});

recette('2.6', async ({ app, ui }) => {
  await app.start();
  await app.pickFolderWith('Copie du coffre', baseVault());
  await app.folderPermission('denied');
  await ui.launchAction(openFolder).click();
  await expect(ui.launcherStatus).toContainText(/accès à ce dossier n.a pas été accordé/);
  await expect(ui.launcher).toBeVisible();
});

recette('2.7', async ({ app, ui }) => {
  await app.start();
  await ui.launchAction(newVault).click();
  await expect(ui.page.getByLabel('Nom du coffre')).toBeVisible();
  await expect(ui.page.getByRole('button', { name: 'Créer', exact: true })).toBeVisible();
  await expect(ui.page.getByRole('button', { name: 'Annuler', exact: true })).toBeVisible();
});

recette('2.8', async ({ app, ui }) => {
  await app.start();
  await ui.launchAction(newVault).click();
  await ui.page.getByLabel('Nom du coffre').press('Escape');
  await expect(ui.page.getByLabel('Nom du coffre')).toBeHidden();
});

recette('2.9', async ({ app, ui }) => {
  await app.start();
  await ui.launchAction(newVault).click();
  await ui.page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(ui.page.getByLabel('Nom du coffre')).toBeHidden();
});

recette('2.10', async ({ app, ui }) => {
  await app.start();
  const parent = await app.folder('Parent');
  await app.answerFolderDialog(parent);
  await ui.launchAction(newVault).click();
  await ui.page.getByLabel('Nom du coffre').fill('Projet X');
  await ui.page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(ui.vaultName).toHaveText('Projet X');
  expect(existsSync(path.join(parent, 'Projet X'))).toBe(true);
  await expect(ui.page.locator('.tree-empty')).toBeVisible();
});

recette('2.11', async ({ app, ui }) => {
  await app.start();
  const parent = await app.folder('Parent');
  await app.answerFolderDialog(parent);
  await ui.launchAction(newVault).click();
  await ui.page.getByLabel('Nom du coffre').fill('a/b:c*d');
  await ui.page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(ui.vaultName).toHaveText('abcd');
  expect(existsSync(path.join(parent, 'abcd'))).toBe(true);
});

recette('2.12', async ({ app, ui }) => {
  await app.start();
  if (app.desktop) await app.answerFolderDialog(await app.folder('Parent'));
  await ui.launchAction(newVault).click();
  await ui.page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(ui.vaultName).toHaveText('Mes notes');
});

recette('2.13', async ({ app, ui }) => {
  await app.start();
  await ui.launchAction(newVault).click();
  await ui.page.getByLabel('Nom du coffre').fill('Carnet');
  await ui.page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(ui.vaultName).toHaveText('Carnet');
  await expect(ui.page.locator('.tree-empty')).toBeVisible();
});

recette('2.14', async ({ app, ui }) => {
  await app.start({ vault: 'demo' });
  await expect(ui.activeTab).toContainText('Bienvenue');
});

recette('2.15', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Mes notes' });
  await ui.switchVault();
  const row = ui.recent('Mes notes');
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  await expect(row.locator('.recent-date')).toHaveText(today);
  await row.locator('.recent-open').click();
  await expect(ui.vaultName).toHaveText('Mes notes');
});

recette('2.16', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Mes notes', open: false });
  await ui.recent('Mes notes').getByRole('button', { name: 'Retirer de la liste' }).click();
  await expect(ui.recentRows).toHaveCount(0);
  expect(existsSync(path.join(app.root, 'Bienvenue.md'))).toBe(true);
});

recette('2.17', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Carnet', open: false });
  await ui.recent('Carnet').getByRole('button', { name: 'Supprimer ce coffre' }).click();
  await expect(ui.recent('Carnet').locator('.recent-confirm').getByRole('button', { name: 'Supprimer ce coffre' })).toBeVisible();
  await expect(ui.recent('Carnet').getByRole('button', { name: 'Annuler' })).toBeVisible();
});

recette('2.18', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Carnet', open: false });
  await ui.recent('Carnet').getByRole('button', { name: 'Supprimer ce coffre' }).click();
  await ui.recent('Carnet').locator('.recent-confirm').getByRole('button', { name: 'Supprimer ce coffre' }).click();
  await expect(ui.recentRows).toHaveCount(0);
  await expect.poll(() => app.exists('Bienvenue.md')).toBe(false);
});

recette('2.19', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Carnet', open: false });
  await ui.recent('Carnet').getByRole('button', { name: 'Supprimer ce coffre' }).click();
  await ui.recent('Carnet').getByRole('button', { name: 'Annuler' }).click();
  await expect(ui.recent('Carnet').locator('.recent-confirm')).toHaveCount(0);
  await ui.recent('Carnet').locator('.recent-open').click();
  await expect(ui.row('Bienvenue.md')).toBeVisible();
});

recette('2.20', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.switchVault();
  const renamed = path.join(path.dirname(app.root), 'MonCoffre renommé');
  await rename(app.root, renamed);
  await ui.recent('MonCoffre').locator('.recent-open').click();
  await expect(ui.lost.locator('h2')).toHaveText(/« MonCoffre » s.appelle maintenant « MonCoffre renommé »/);
  await expect(ui.lost.locator('.lost-paths')).toContainText(renamed);
  await expect(ui.launcher).not.toContainText(/Error|ENOENT/);
});

recette('2.21', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Mes notes' });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await app.restart();
  await expect(ui.vaultName).toHaveText('Mes notes');
  await expect(ui.tab('Idées')).toBeVisible();
  await expect(ui.tab('Étude')).toBeVisible();
});

recette('2.22', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Carnet' });
  await app.restart();
  await expect(ui.vaultName).toHaveText('Carnet');
});

recette('2.23', async ({ app, ui }) => {
  await app.start();
  await app.pickFolderWith('Dossier réel', baseVault());
  await ui.launchAction(openFolder).click();
  await expect(ui.vaultName).toHaveText('Dossier réel');
  await app.restart();
  await expect(ui.launcher).toBeVisible();
  await ui.recent('Dossier réel').locator('.recent-open').click();
  await expect(ui.vaultName).toHaveText('Dossier réel');
});

recette('2.24', async ({ app, ui }) => {
  await app.start({ vault: manyNotes(4000), name: 'Gros coffre', open: false });
  await ui.recent('Gros coffre').locator('.recent-open').click();
  await expect(ui.launcherStatus).toContainText('Ouverture de Gros coffre');
  await expect(ui.launchAction(newVault)).toBeDisabled();
  await expect(ui.vaultName).toHaveText('Gros coffre', { timeout: 30_000 });
});

recette('2.25', async ({ app, ui }) => {
  await app.start({ viewport: { width: 390, height: 844 } });
  await expect(ui.launcher).toBeVisible();
  expect(await ui.overflowsSideways()).toBe(false);
});

// ------------------------------------------------------------- vaults whose folder moved (desktop)

recette('2.26', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.openInNewTab('Idées');
  const renamed = path.join(path.dirname(app.root), 'Notes');
  await app.restart(() => rename(app.root, renamed));
  await expect(ui.lost.locator('h2')).toHaveText(/s.appelle maintenant « Notes »/);
  await ui.lost.getByRole('button', { name: 'Suivre et ouvrir' }).click();
  await expect(ui.vaultName).toHaveText('Notes');
  await expect(ui.tab('Idées')).toBeVisible();
});

recette('2.27', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.switchVault();
  const moved = path.join(path.dirname(app.root), 'Archives', 'MonCoffre');
  await app.folder('Archives');
  await rename(app.root, moved);
  await ui.recent('MonCoffre').locator('.recent-open').click();
  await expect(ui.lost.locator('.lost-paths')).toContainText(moved);
  await ui.lost.getByRole('button', { name: 'Suivre et ouvrir' }).click();
  await expect(ui.row('Bienvenue.md')).toBeVisible();
});

recette('2.28', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre', open: false });
  await app.restart(() => rm(app.root, { recursive: true }));
  const row = ui.recent('MonCoffre');
  await expect(row.locator('.recent-state')).toHaveText('Introuvable');
  await expect(row.locator('.recent-state svg circle')).toHaveCount(1);
  await expect(row.locator('.recent-date')).toHaveCount(0);
});

recette('2.29', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre', open: false });
  await app.restart(() => rm(app.root, { recursive: true }));
  await ui.recent('MonCoffre').locator('.recent-open').click();
  await expect(ui.lost.locator('h2')).toHaveText(/Le dossier de « MonCoffre » est introuvable/);
  for (const name of [/Retrouver le dossier/, /Retirer de la liste/, /Pas maintenant/]) {
    await expect(ui.lost.getByRole('button', { name })).toBeVisible();
  }
});

/** The vault goes to another drive, say: same files, another folder identity, not found. */
async function copyAway(app: { root: string; folder: (p: string) => Promise<string> }, name: string) {
  const copy = path.join(await app.folder('Ailleurs'), name);
  await cp(app.root, copy, { recursive: true });
  await rm(app.root, { recursive: true });
  return copy;
}

recette('2.30', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.openInNewTab('Idées');
  await ui.switchVault();
  const copy = await copyAway(app, 'MonCoffre sauvé');
  await ui.recent('MonCoffre').locator('.recent-open').click();
  await expect(ui.lost.locator('h2')).toHaveText(/introuvable/);
  await app.answerFolderDialog(copy);
  await ui.lost.getByRole('button', { name: /Retrouver le dossier/ }).click();
  await expect(ui.vaultName).toHaveText('MonCoffre sauvé');
  await expect(ui.tab('Idées')).toBeVisible();
  await ui.switchVault();
  await expect(ui.recentRows).toHaveCount(1);
});

recette('2.31', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre' });
  await ui.switchVault();
  await rename(app.root, path.join(path.dirname(app.root), 'Renommé'));
  await ui.recent('MonCoffre').locator('.recent-open').click();
  await app.answerFolderDialog(null);
  await ui.lost.getByRole('button', { name: /autre dossier/ }).click();
  await expect.poll(() => app.folderDialogs()).toBe(1);
  await expect(ui.lost.locator('h2')).toHaveText(/s.appelle maintenant/);
});

recette('2.32', async ({ app, ui }) => {
  const elsewhere = path.join(homedir(), 'cobblestone-recette-absent', 'Perdu');
  await app.start({
    vault: baseVault(),
    name: 'MonCoffre',
    open: false,
    recents: [{ id: 'v2', name: 'Perdu', location: elsewhere }],
  });
  await ui.recent('Perdu').locator('.recent-open').click();
  await ui.lost.getByRole('button', { name: /Pas maintenant/ }).click();
  await expect(ui.lost).toHaveCount(0);
  await ui.recent('Perdu').locator('.recent-open').click();
  await ui.lost.getByRole('button', { name: /Retirer de la liste/ }).click();
  await expect(ui.recent('Perdu')).toHaveCount(0);
  await expect(ui.recent('MonCoffre')).toBeVisible();
  expect(existsSync(path.join(app.root, 'Bienvenue.md'))).toBe(true);
});

recette('2.33', async ({ app, ui }) => {
  await app.start();
  await app.pickFolderWith('MonCoffre', baseVault());
  await ui.launchAction(openFolder).click();
  await expect(ui.vaultName).toHaveText('MonCoffre');
  await ui.openInNewTab('Idées');
  await ui.switchVault();
  // "Renamed on disk": the folder the browser knew is gone, a copy stands elsewhere.
  await app.pickFolderWith('MonCoffre renommé', baseVault());
  await ui.page.evaluate(async () => {
    const picked = await (await navigator.storage.getDirectory()).getDirectoryHandle('picked');
    await picked.removeEntry('MonCoffre', { recursive: true });
  });
  await ui.recent('MonCoffre').locator('.recent-open').click();
  await expect(ui.lost.locator('h2')).toHaveText(/introuvable/);
  await ui.lost.getByRole('button', { name: /Retrouver le dossier/ }).click();
  await expect(ui.vaultName).toHaveText('MonCoffre renommé');
  await expect(ui.tab('Idées')).toBeVisible();
});

recette('2.34', async ({ app, ui }) => {
  await app.start();
  await app.answerFolderDialog(app.userData);
  await ui.launchAction(openFolder).click();
  await expect(ui.launcherStatus).toContainText(/réglages de Cobblestone lui-même/);
  await ui.launchAction(newVault).click();
  await ui.page.getByLabel('Nom du coffre').fill('Dedans');
  await ui.page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(ui.launcherStatus).toContainText(/réglages de Cobblestone lui-même/);
});

/** Where the first and last characters of a recent vault's path are drawn, against its box. */
async function pathEnds(row: import('@playwright/test').Locator) {
  return row.locator('.recent-where').evaluate((span) => {
    const text = span.firstChild as Text;
    const content = text.data;
    const at = (i: number) => {
      const range = document.createRange();
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      return range.getBoundingClientRect();
    };
    const first = content.indexOf('/');
    const last = content.replace(/‎/g, '').length - 1 + (content.startsWith('‎') ? 1 : 0);
    const box = span.getBoundingClientRect();
    return { left: box.left, right: box.right, first: at(first).left, last: at(last).right, char: content[first] };
  });
}

recette('2.35', async ({ app, ui }) => {
  const long = 'Un dossier au nom vraiment très long pour que son chemin ne tienne pas dans la ligne';
  await app.start({
    vault: baseVault(),
    name: 'Court',
    open: false,
    recents: [{ id: 'v2', name: 'Long', location: `/tmp/${long}/${long}` }],
  });
  const short = await pathEnds(ui.recent('Court'));
  expect(short.char).toBe('/');
  expect(short.first).toBeLessThan(short.left + 12); // the leading slash is drawn first, on the left
  const cut = await pathEnds(ui.recent('Long'));
  expect(cut.first).toBeLessThan(cut.left); // the start is cut away
  expect(cut.last).toBeLessThanOrEqual(cut.right + 1); // the end stays visible
});

recette('2.36', async ({ app, ui }) => {
  await app.start();
  await rm(app.userData, { recursive: true, force: true });
  await ui.launchAction(/Essayer la démo/).click();
  await ui.switchVault();
  await app.answerFolderDialog(await app.folder('Parent'));
  await ui.launchAction(newVault).click();
  await ui.page.getByLabel('Nom du coffre').fill('Après remise à zéro');
  await ui.page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(ui.vaultName).toHaveText('Après remise à zéro');
  expect(existsSync(path.join(app.userData, 'storage.json'))).toBe(true);
});

recette('2.37', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'Premier' });
  const second = await app.folder('Second', { 'Note.md': 'second' });
  await ui.switchVault();
  await ui.launchAction(/Essayer la démo/).click();
  await ui.switchVault();
  await app.answerFolderDialog(second);
  await ui.launchAction(openFolder).click();
  await expect(ui.vaultName).toHaveText('Second');
  await ui.switchVault();
  await expect(ui.recentRows).toHaveCount(2);
  await expect(ui.launcherStatus).toHaveCount(0);
});

recette('2.38', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), name: 'MonCoffre', open: false });
  const parent = path.dirname(app.root);
  await app.restart(() => rm(app.root, { recursive: true }));
  await ui.recent('MonCoffre').locator('.recent-open').click();
  await app.answerFolderDialog(parent);
  await ui.lost.getByRole('button', { name: /Retrouver le dossier/ }).click();
  await expect(ui.lost.locator('.lost-error')).toContainText(/dossier qui contenait le coffre/);
  await ui.lost.getByRole('button', { name: /Pas maintenant/ }).click();
  await expect(ui.launchAction(newVault)).toBeEnabled();
});

recette('2.39', async ({ app, ui }) => {
  await app.start();
  for (const folder of [homedir(), '/']) {
    await app.answerFolderDialog(folder);
    await ui.launchAction(openFolder).click();
    await expect(ui.launcherStatus).toContainText(/dossier personnel entier ou tout un disque/);
  }
});

recette('2.40', async ({ app, ui }) => {
  await app.start({ vault: manyNotes(4000), name: 'Gros coffre', open: false });
  await ui.recent('Gros coffre').locator('.recent-open').click();
  await expect(ui.launcherStatus).toContainText(/notes lues sur 4\s?000/);
  await ui.launcherStatus.getByRole('button', { name: 'Annuler' }).click();
  await expect(ui.launchAction(newVault)).toBeEnabled();
  await ui.page.waitForTimeout(1500);
  await expect(ui.vaultName).toHaveCount(0);
});

recette('2.41', async ({ app, ui }) => {
  const other = path.join(homedir(), 'cobblestone-recette-absent', 'Perdu');
  await app.start({ vault: baseVault(), name: 'Autre', open: false, recents: [{ id: 'v2', name: 'Perdu', location: other }] });
  await ui.recent('Perdu').locator('.recent-open').click();
  await app.answerFolderDialog(app.root);
  await ui.lost.getByRole('button', { name: /Retrouver le dossier/ }).click();
  await expect(ui.lost.locator('.lost-error')).toContainText(/déjà un autre coffre de ta liste/);
});

recette('2.42', async ({ app, ui }) => {
  await app.start();
  await app.restart(async () => {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(
      path.join(app.userData, 'vaults.json'),
      JSON.stringify([{ id: 'old', name: 'Cobblestone', kind: 'folder', location: app.userData, lastOpened: Date.now() }]),
    );
  });
  await ui.recent('Cobblestone').locator('.recent-open').click();
  await expect(ui.launcherStatus).toContainText(/réglages de Cobblestone lui-même/);
  await ui.recent('Cobblestone').getByRole('button', { name: 'Retirer de la liste' }).click();
  await expect(ui.recentRows).toHaveCount(0);
});
