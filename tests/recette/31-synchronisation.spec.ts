import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createRelay } from '../../apps/relay/src/relay';
import { expect, recette } from './lib/recette';
import { askToJoin, pair, syncPopover, syncStatus, twoDevices } from './lib/sync';
import { baseVault } from './lib/vaults';

// 31. Synchronisation entre appareils.

const image = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4, 5]);

recette('31.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  const section = settings.locator('[data-section="sync"]');
  await expect(section.getByText('Ce coffre n’est encore sur aucun autre appareil')).toBeVisible();
  await expect(section.getByRole('button', { name: 'Ajouter un appareil' })).toBeVisible();
  await expect(section.locator('.sync-how li')).toHaveCount(3);
  const name = section.getByRole('textbox', { name: 'Nom de cet appareil' });
  await expect(name).toHaveValue('Ordinateur (Linux)');
  await name.fill('Portable du salon');
  await name.press('Enter');
  await app.restart();
  await expect((await ui.settings()).getByRole('textbox', { name: 'Nom de cet appareil' })).toHaveValue('Portable du salon');
});

recette('31.2', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await askToJoin(a, b, 'Bureau de Léa');
    const dialog = a.ui.page.getByRole('dialog', { name: 'Ajouter un appareil' });
    await expect(dialog.getByText('Un appareil a saisi le code. L’accepter ?')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Accepter Bureau de Léa' })).toBeVisible();
    await expect(b.ui.page.getByText('Le code est bon. En attente de l’accord de l’autre appareil…')).toBeVisible();
  });
});

recette('31.3', async ({ app, ui }, testInfo) => {
  const files = baseVault({ 'Dossier/Profond.md': 'tout au fond', 'images/logo.png': image });
  await twoDevices({ app, ui }, files, testInfo, async (a, b) => {
    await pair(a, b);
    for (const [path, content] of Object.entries(files)) {
      if (typeof content === 'string') await expect.poll(() => b.app.readOr(path)).toBe(content);
    }
    await expect
      .poll(async () => [...(await b.app.readBytes('images/logo.png').catch(() => new Uint8Array()))])
      .toEqual([...image]);
    await expect(b.ui.row('Dossier')).toBeVisible();
  });
});

recette('31.4', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await pair(a, b);
    await expect.poll(() => b.app.readOr('Idées.md')).toContain('Une idée');
    await a.ui.open('Idées');
    await a.ui.append(' Écrit sur le premier.');
    await expect.poll(() => b.app.readOr('Idées.md')).toContain('Écrit sur le premier.');
    // In the note open on the other device too.
    await b.ui.open('Idées');
    await b.ui.append(' Et sur le second.');
    await expect.poll(() => a.ui.doc()).toContain('Et sur le second.');
    await expect.poll(() => a.app.readOr('Idées.md')).toContain('Écrit sur le premier. Et sur le second.');
  });
});

recette('31.5', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault({ 'Racine.md': 'Vers [[Cible]].', 'Cible.md': 'cible' }), testInfo, async (a, b) => {
    await pair(a, b);
    await expect.poll(() => b.app.readOr('Cible.md')).toBe('cible');
    await a.app.write('Nouvelle.md', 'toute neuve');
    await expect.poll(() => b.app.readOr('Nouvelle.md')).toBe('toute neuve');

    await a.ui.contextMenu('Cible.md', 'Renommer');
    await a.ui.page.locator('.tree-rename').fill('Cible renommée');
    await a.ui.page.locator('.tree-rename').press('Enter');
    await expect.poll(() => b.app.exists('Cible renommée.md')).toBe(true);
    await expect.poll(() => b.app.readOr('Racine.md')).toBe('Vers [[Cible renommée]].');
    expect(await b.app.exists('Cible.md')).toBe(false);

    await a.ui.contextMenu('Nouvelle.md', 'Mettre à la corbeille');
    await expect.poll(() => b.app.exists('Nouvelle.md')).toBe(false);
    expect(await b.app.readOr('.trash/Nouvelle.md')).toBe('toute neuve');
  });
});

recette('31.6', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    const shown = await askToJoin(a, b, 'PC fixe', 'AAAAAAAAA');
    expect(shown).not.toBe('AAAAAAAAA');
    await expect(b.ui.page.getByRole('alert')).toContainText('Aucun appareil autour n’affiche ce code', { timeout: 40_000 });
    await b.ui.page.getByRole('textbox', { name: 'Code' }).fill('ABC');
    await b.ui.page.getByRole('button', { name: 'Continuer' }).click();
    await expect(b.ui.page.getByRole('alert')).toContainText('Un code a neuf lettres et chiffres');
    await expect(b.ui.page.locator('.workbench')).toHaveCount(0);
  });
});

recette('31.7', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await askToJoin(a, b);
    await a.ui.page.getByRole('button', { name: 'Refuser' }).click();
    await expect(b.ui.page.getByRole('alert')).toContainText('L’autre appareil a refusé celui-ci');
    const dialog = a.ui.page.getByRole('dialog', { name: 'Ajouter un appareil' });
    await expect(dialog).toContainText('Tu as refusé l’appareil.');
    await expect(dialog.getByRole('button', { name: 'Nouveau code' })).toBeVisible();
  });
});

recette('31.8', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await pair(a, b);
    await expect(syncStatus(a.ui)).toHaveText('À jour · 2 appareils');
    await expect(syncStatus(b.ui)).toHaveText('À jour · 2 appareils');
    await syncStatus(a.ui).click();
    const popover = syncPopover(a.ui);
    await expect(popover).toContainText('PC fixe');
    await expect(popover).toContainText('En ligne, sur le même réseau');
    await expect(popover.getByRole('button', { name: 'Mettre en pause' })).toBeVisible();
    await popover.getByRole('button', { name: 'Réglages de synchronisation' }).click();
    await expect(a.ui.view.locator('[data-section="sync"]')).toBeInViewport();
  });
});

recette('31.9', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await pair(a, b);
    await expect.poll(() => b.app.readOr('Idées.md')).toContain('Une idée');
    await syncStatus(a.ui).click();
    await syncPopover(a.ui).getByRole('button', { name: 'Mettre en pause' }).click();
    await expect(syncStatus(a.ui)).toHaveText('Synchro en pause');
    await a.app.write('Pendant la pause.md', 'gardée ici');
    await a.ui.page.waitForTimeout(3000);
    expect(await b.app.exists('Pendant la pause.md')).toBe(false);
    await syncPopover(a.ui).getByRole('button', { name: 'Reprendre' }).click();
    await expect.poll(() => b.app.readOr('Pendant la pause.md'), { timeout: 20_000 }).toBe('gardée ici');
    await expect(syncStatus(a.ui)).toHaveText('À jour · 2 appareils', { timeout: 20_000 });
  });
});

recette('31.10', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await pair(a, b);
    const settings = await a.ui.settings();
    const devices = settings.locator('.sync-devices');
    await expect(devices).toContainText('PC fixe');
    await devices.locator('.sync-device', { hasText: 'PC fixe' }).getByRole('button', { name: 'Retirer' }).click();
    await devices.getByRole('group', { name: 'Retirer' }).getByRole('button', { name: 'Retirer' }).click();
    await expect(devices).not.toContainText('PC fixe');
    await expect(syncStatus(b.ui)).toHaveText('Retiré de ce coffre', { timeout: 20_000 });
    await b.app.write('Après le retrait.md', 'reste ici');
    await a.ui.page.waitForTimeout(3000);
    expect(await a.app.exists('Après le retrait.md')).toBe(false);
  });
});

recette('31.11', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await pair(a, b);
    await expect.poll(() => b.app.readOr('Idées.md')).toContain('Une idée');
    await b.app.restart(async () => {
      await a.app.write('Pendant l’absence.md', 'écrit sans lui');
      await expect(syncStatus(a.ui)).toHaveText('Hors ligne', { timeout: 20_000 });
    });
    await b.app.electron.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().forEach((w) => w.webContents.setBackgroundThrottling(false)),
    );
    await expect.poll(() => b.app.readOr('Pendant l’absence.md'), { timeout: 30_000 }).toBe('écrit sans lui');
    await expect(syncStatus(a.ui)).toHaveText('À jour · 2 appareils', { timeout: 20_000 });
  });
});

recette('31.12', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await pair(a, b);
    await expect.poll(() => b.app.readOr('Idées.md')).toContain('Une idée');
    await syncStatus(a.ui).click();
    await syncPopover(a.ui).getByRole('button', { name: 'Mettre en pause' }).click();
    await a.app.write('Réunion.md', 'version du premier');
    await b.app.write('Réunion.md', 'version du second');
    await a.ui.page.waitForTimeout(1500);
    await syncPopover(a.ui).getByRole('button', { name: 'Reprendre' }).click();
    const copy = async () => (await a.app.folderEntries()).find((p) => /^Réunion \(conflit [0-9a-f]{4}\)\.md$/.test(p)) ?? null;
    await expect.poll(copy, { timeout: 20_000 }).not.toBeNull();
    const name = (await copy())!;
    const versions = [await a.app.read('Réunion.md'), await a.app.read(name)].sort();
    expect(versions).toEqual(['version du premier', 'version du second']);
    await expect.poll(() => b.app.readOr(name)).not.toBe('');
    await expect(syncStatus(a.ui)).toHaveText('1 à vérifier');
    const settings = await a.ui.settings();
    await expect(settings.locator('.sync-conflicts')).toContainText(name.replace(/\.md$/, ''));
  });
});

recette('31.13', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await pair(a, b);
    await expect.poll(() => b.app.exists('.cobblestone/sync/vault.bin'), { timeout: 20_000 }).toBe(true);
    await expect.poll(() => a.app.exists('.cobblestone/sync/vault.bin'), { timeout: 20_000 }).toBe(true);
    for (const device of [a, b]) {
      const secret = ((await device.app.storage('sync:identity')) as { secretKey: string }).secretKey;
      expect(secret).toMatch(/^[A-Za-z0-9+/=]{40,}$/);
      const everything = await device.app.readAll();
      expect(everything.includes(secret)).toBe(false);
      expect(await device.app.exists('.obsidian')).toBe(false);
    }
  });
});

recette(
  '31.14',
  async ({ app, ui }) => {
    await app.start({ vault: baseVault() });
    const settings = await ui.settings();
    const section = settings.locator('[data-section="sync"]');
    await expect(section.getByRole('button', { name: 'Ajouter un appareil' })).toBeVisible();
    await expect(section.getByRole('switch', { name: 'Synchroniser par Internet' })).toHaveAttribute('aria-checked', 'true');
    await expect(section.getByRole('textbox', { name: 'Adresse du relais' })).toBeVisible();
    await ui.switchVault();
    await expect(ui.page.getByRole('button', { name: /Recevoir un coffre/ })).toBeVisible();
  },
  { seulement: ['web'] },
);

recette.manuel('31.15', 'deux ordinateurs réels sur un même réseau Wi-Fi, avec leur pare-feu');

recette('31.16', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await pair(a, b);
    await expect.poll(() => b.app.readOr('Idées.md')).toContain('Une idée');
    await a.ui.open('Idées');
    await b.ui.open('Idées');
    await a.ui.editor.click();
    await a.ui.page.keyboard.press('Control+Home');
    await b.ui.editEnd();
    await Promise.all([
      a.ui.page.keyboard.type('Au début. ', { delay: 20 }),
      b.ui.page.keyboard.type(' À la fin.', { delay: 20 }),
    ]);
    await expect.poll(() => a.ui.doc()).toContain('À la fin.');
    await expect.poll(() => b.ui.doc()).toContain('Au début. ');
    await expect.poll(() => a.app.readOr('Idées.md')).toMatch(/^Au début\. .*À la fin\.$/s);
    await expect.poll(() => b.app.readOr('Idées.md')).toBe(await a.app.read('Idées.md'));
  });
});

recette('31.17', async ({ app, ui }, testInfo) => {
  await twoDevices({ app, ui }, baseVault(), testInfo, async (a, b) => {
    await pair(a, b);
    await expect.poll(() => b.app.readOr('Idées.md')).toContain('Une idée');
    await mkdir(path.join(a.app.root, 'Dossier vide'));
    await expect.poll(() => b.app.exists('Dossier vide'), { timeout: 20_000 }).toBe(true);
    await expect(b.ui.row('Dossier vide')).toBeVisible();
    await rm(path.join(a.app.root, 'Dossier vide'), { recursive: true });
    await expect.poll(() => b.app.exists('Dossier vide'), { timeout: 20_000 }).toBe(false);
  });
});
recette.manuel('31.18', 'remplir un disque pour de vrai ; le cas est couvert par vault-sync.test.ts');

recette('31.19', async ({ app, ui }, testInfo) => {
  const relay = await createRelay({ port: 0, host: '127.0.0.1' });
  try {
    const storage = { 'sync:relay': { enabled: true, url: `ws://127.0.0.1:${relay.port}` } };
    await twoDevices(
      { app, ui },
      baseVault(),
      testInfo,
      async (a, b) => {
        await pair(a, b);
        await expect.poll(() => b.app.readOr('Idées.md'), { timeout: 20_000 }).toContain('Une idée');
        await a.app.write('Par Internet.md', 'passée par le relais');
        await expect.poll(() => b.app.readOr('Par Internet.md'), { timeout: 20_000 }).toBe('passée par le relais');
      },
      { env: { COBBLESTONE_LAN_OFF: '1' }, storage },
    );
  } finally {
    await relay.close();
  }
});
