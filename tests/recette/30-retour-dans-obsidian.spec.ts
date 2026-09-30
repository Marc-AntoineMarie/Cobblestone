import { expect, recette } from './lib/recette';
import { obsidianVault } from './lib/vaults';

// 30. Retour dans Obsidian.

recette.manuel('30.1', 'ouvrir la copie du coffre dans Obsidian, qui n’est pas lancé par les tests');
recette.manuel('30.2', 'suivre les liens dans Obsidian lui-même ; les règles de liens sont vérifiées par les tests unitaires');
recette.manuel('30.3', 'ouvrir les canvas dans Obsidian lui-même ; le format JSON Canvas est vérifié par les tests unitaires');

recette('30.4', async ({ app, ui }) => {
  const vault = obsidianVault();
  await app.start({ vault });
  // A session that changes settings, bookmarks, notes and names.
  const settings = await ui.settings();
  await settings.locator('#set-text-size').selectOption('20');
  await settings.locator('#set-attach').selectOption('/');
  await ui.open('Idées');
  await ui.noteBar.getByRole('button', { name: 'Ajouter aux favoris' }).click();
  await ui.mode('Écrire');
  await ui.append('\nModifié');
  await ui.page.waitForTimeout(800);
  for (const [path, content] of Object.entries(vault).filter(([p]) => p.startsWith('.obsidian/'))) {
    expect(await app.read(path)).toBe(content);
  }
});

recette('30.5', async ({ app, ui }) => {
  const vault = obsidianVault();
  await app.start({ vault });
  await ui.contextMenu('Idées.md', 'Ajouter aux favoris');
  await expect.poll(() => app.readOr('.cobblestone/bookmarks.json')).toContain('Idées.md');
  expect(await app.read('.obsidian/bookmarks.json')).toBe(vault['.obsidian/bookmarks.json']);
});

recette.manuel('30.6', 'regarder dans Obsidian lui-même ; .cobblestone et .trash sont des dossiers cachés');
