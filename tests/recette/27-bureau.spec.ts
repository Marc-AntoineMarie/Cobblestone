import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';

// 27. Spécifique à l'app de bureau.

recette('27.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Web.md': '[le site](https://example.org)\n\nfin' }) });
  await app.electron.evaluate(({ shell }) => {
    (globalThis as { __external?: string[] }).__external = [];
    shell.openExternal = async (url: string) => void (globalThis as { __external?: string[] }).__external!.push(url);
  });
  await ui.open('Web');
  await ui.mode('Lire');
  await ui.reading.locator('a', { hasText: 'le site' }).click();
  await expect
    .poll(() => app.electron.evaluate(() => (globalThis as { __external?: string[] }).__external))
    .toEqual(['https://example.org/']);
  expect(await app.electron.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  expect(ui.page.url()).not.toContain('example.org');
});

recette('27.2', async ({ app }) => {
  await app.start();
  const size = await app.electron.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]!;
    window.setSize(200, 150);
    return window.getSize();
  });
  expect(size[0]).toBeGreaterThanOrEqual(480);
  expect(size[1]).toBeGreaterThanOrEqual(360);
});

recette('27.3', async ({ app }) => {
  await app.start();
  const menu = await app.electron.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]!;
    return { autoHide: window.isMenuBarAutoHide(), visible: window.isMenuBarVisible() };
  });
  expect(menu).toEqual({ autoHide: true, visible: false });
});

recette('27.4', async ({ app, ui }) => {
  const long = '/tmp/un/chemin/vraiment/très/long/pour/voir/comment/il/est/coupé/par/la/gauche/dans/la/liste/Coffre';
  await app.start({ vault: baseVault(), name: 'Court', open: false, recents: [{ id: 'v2', name: 'Loin', location: long }] });
  const where = ui.recent('Loin').locator('.recent-where');
  await expect(where).toContainText(long);
  const cut = await where.evaluate((el) => {
    const text = el.firstChild as Text;
    const range = document.createRange();
    const end = text.data.length - 1;
    range.setStart(text, end - 1);
    range.setEnd(text, end);
    return {
      end: range.getBoundingClientRect().right,
      right: el.getBoundingClientRect().right,
      overflow: el.scrollWidth > el.clientWidth,
    };
  });
  expect(cut.overflow).toBe(true);
  expect(cut.end).toBeLessThanOrEqual(cut.right + 1);
});

recette.manuel('27.5', 'demande un disque externe ou un dossier synchronisé réels');

recette('27.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.waitForTimeout(800);
  expect(existsSync(path.join(app.userData, 'vaults.json'))).toBe(true);
  expect(existsSync(path.join(app.userData, 'storage.json'))).toBe(true);
});

recette.manuel('27.7', 'l’icône et le nom dans le menu du système se voient sur la version installée');

recette('27.8', async ({ app }) => {
  await app.start();
  const exited = new Promise<void>((resolve) => app.electron.process().once('exit', () => resolve()));
  await app.electron.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close());
  await expect(exited).resolves.toBeUndefined();
});

recette.manuel(
  '27.9',
  'installer le .deb demande les droits administrateur ; le paquet contient bien les icônes (vérifié à la construction)',
);
recette.manuel('27.10', 'l’icône de la fenêtre se voit dans la barre des tâches, sous X11');
