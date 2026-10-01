import path from 'node:path';
import { expect, type TestInfo } from '@playwright/test';
import { Cobble, type Files } from './cobble';
import { Ui } from './ui';

export interface Device {
  app: Cobble;
  ui: Ui;
}

/**
 * Two desktop apps on this machine, on a network port of the test's own, so
 * that tests running side by side do not meet. The first opens `files`; the
 * second waits on its start screen. `body` gets both; the second closes after.
 */
export async function twoDevices(
  first: Device,
  files: Files,
  testInfo: TestInfo,
  body: (a: Device, b: Device) => Promise<void>,
  more: { env?: Record<string, string>; storage?: Record<string, unknown>; secondStorage?: Record<string, unknown> } = {},
) {
  // Two apps, a pairing and more: longer than a single app's test.
  testInfo.setTimeout(testInfo.timeout * 3);
  const env: Record<string, string> = {
    COBBLESTONE_LAN_PORT: String(48_000 + ((testInfo.workerIndex * 97 + testInfo.retry * 13 + Date.now()) % 1500)),
  };
  Object.assign(env, more.env);
  await first.app.start({ vault: files, env, storage: more.storage });
  const app = new Cobble('bureau', null);
  try {
    await app.start({ vault: null, env, storage: more.secondStorage ?? more.storage });
    // Two windows on one screen: the one behind would stop drawing (no animation frames) and look stuck.
    for (const device of [first.app, app]) {
      await device.electron.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().forEach((w) => w.webContents.setBackgroundThrottling(false)),
      );
    }
    await body(first, { app, ui: new Ui(app) });
    expect(app.errors, 'erreurs non rattrapées dans le second appareil').toEqual([]);
  } finally {
    await app.close();
  }
}

/** The first shows a code in Settings › Sync; the second types it on its start screen, as `name`. */
export async function askToJoin(a: Device, b: Device, name = 'PC fixe', code?: string) {
  const settings = await a.ui.settings();
  await settings.getByRole('button', { name: 'Ajouter un appareil' }).first().click();
  const shown = (await a.ui.page.locator('.pair-code').innerText()).replace(/\s/g, '');
  await b.ui.page.getByRole('button', { name: /Recevoir un coffre/ }).click();
  await b.ui.page.getByRole('textbox', { name: 'Code' }).fill(code ?? shown);
  await b.ui.page.getByRole('textbox', { name: 'Nom de cet appareil' }).fill(name);
  await b.ui.page.getByRole('button', { name: 'Continuer' }).click();
  return shown;
}

/** Pairs the two: the first accepts, the second puts the vault in a new folder and opens it. */
export async function pair(a: Device, b: Device, name = 'PC fixe') {
  await askToJoin(a, b, name);
  await a.ui.page.getByRole('button', { name: `Accepter ${name}` }).click();
  const where = await b.app.folder('reçus');
  await b.app.answerFolderDialog(where);
  await b.ui.page.getByRole('button', { name: /Dans un nouveau dossier/ }).click();
  await b.ui.page.locator('.workbench').waitFor();
  b.app.root = path.join(where, path.basename(a.app.root));
  await a.ui.page.getByRole('button', { name: 'Terminé' }).click();
}

/** The status bar's sync button. */
export const syncStatus = (ui: Ui) => ui.page.locator('.status-sync > button');

/** What a click on it shows. */
export const syncPopover = (ui: Ui) => ui.page.getByRole('dialog', { name: 'Synchronisation' });
