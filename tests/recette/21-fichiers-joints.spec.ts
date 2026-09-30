import { expect, recette } from './lib/recette';
import { baseVault, PNG } from './lib/vaults';

// 21. Fichiers joints.

/** A 2×1 PNG, to tell a new version of the picture from the 1×1 one. */
const PNG_2x1 = Uint8Array.from(
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mNk+M9QzwAEjDAGACCDAgdYwRdlAAAAAElFTkSuQmCC', 'base64'),
);

const files = () =>
  baseVault({
    'docs/manuel.pdf': '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n',
    'docs/son.mp3': new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0]),
    'docs/film.mp4': new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]),
    'docs/notes.txt': 'du texte brut',
    'docs/data.json': '{"a": 1}',
    'docs/table.csv': 'a,b\n1,2',
    'docs/style.css': 'body { color: red; }',
    'docs/archive.zip': new Uint8Array([0x50, 0x4b, 3, 4]),
  });

recette('21.1', async ({ app, ui }) => {
  await app.start({ vault: files() });
  await ui.expand('assets/image.png');
  await ui.row('assets/image.png').click();
  const img = ui.pane.locator('.file-view.is-image img');
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1);
});

recette('21.2', async ({ app, ui }) => {
  await app.start({ vault: files() });
  await ui.expand('docs/manuel.pdf');
  await ui.row('docs/manuel.pdf').click();
  await expect(ui.pane.locator('.file-view.is-pdf iframe')).toHaveAttribute('src', /.+/);
});

recette('21.3', async ({ app, ui }) => {
  await app.start({ vault: files() });
  await ui.expand('docs/son.mp3');
  await ui.row('docs/son.mp3').click();
  await expect(ui.pane.locator('.file-view audio[controls]')).toHaveAttribute('src', /.+/);
  await ui.row('docs/film.mp4').click();
  await expect(ui.pane.locator('.file-view video[controls]')).toHaveAttribute('src', /.+/);
});

recette('21.4', async ({ app, ui }) => {
  await app.start({ vault: files() });
  await ui.expand('docs/notes.txt');
  const expected = {
    'docs/notes.txt': 'du texte brut',
    'docs/data.json': '{"a": 1}',
    'docs/table.csv': 'a,b\n1,2',
    'docs/style.css': 'body { color: red; }',
  };
  for (const [path, text] of Object.entries(expected)) {
    await ui.row(path).click();
    await expect(ui.pane.locator('.file-view pre')).toHaveText(text);
  }
});

recette('21.5', async ({ app, ui }) => {
  await app.start({ vault: files() });
  await ui.expand('docs/archive.zip');
  await ui.row('docs/archive.zip').click();
  await expect(ui.pane.locator('.file-unsupported')).toHaveText('Cobblestone ne sait pas encore afficher ce fichier.');
});

recette('21.6', async ({ app, ui }) => {
  await app.start({ vault: files() });
  await ui.expand('assets/image.png');
  await ui.row('assets/image.png').click();
  const img = ui.pane.locator('.file-view.is-image img');
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1);
  await ui.open('Idées');
  await app.write('assets/image.png', PNG_2x1);
  await ui.page.waitForTimeout(1500);
  await ui.row('assets/image.png').click();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), { timeout: 8000 }).toBe(2);
  expect(PNG.length).toBeGreaterThan(0);
});
