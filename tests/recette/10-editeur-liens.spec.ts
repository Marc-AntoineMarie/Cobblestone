import { expect, recette } from './lib/recette';
import { baseVault, PNG } from './lib/vaults';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 10. Éditeur : liens, intégrations, tags, propriétés.

const long = '\n\nParagraphe de remplissage.'.repeat(60);
const vault = (text: string) =>
  baseVault({
    'Essai.md': text,
    'Projets/Plan.md': `# Plan${long}\n\n## Suite\n\nLa suite du plan.\n\nUn bloc précis ^bloc-un\n`,
    'docs/manuel.pdf': '%PDF-1.4\n%%EOF\n',
    'docs/son.mp3': new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0]),
    'docs/film.mp4': new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]),
  });

const link = (ui: Ui, text: string) => ui.editor.locator('.cm-wikilink, .cm-link', { hasText: text }).first();

/** Opens the note and puts the cursor on its last line, away from the links. */
async function openAway(app: Cobble, ui: Ui, text: string) {
  await app.start({ vault: vault(text + '\n\nfin') });
  await ui.open('Essai');
  await ui.editEnd();
}

recette('10.1', async ({ app, ui }) => {
  await openAway(app, ui, 'Voir [[Idées]] ici');
  const wiki = link(ui, 'Idées');
  await expect(wiki).toHaveText('Idées');
  await expect(ui.lines.first()).toHaveText('Voir Idées ici');
  expect(await wiki.evaluate((el) => getComputedStyle(el).textDecorationColor)).toMatch(/255, 72, 176/);
});

recette('10.2', async ({ app, ui }) => {
  await openAway(app, ui, 'Voir [[Idées]] ici');
  await link(ui, 'Idées').click();
  await expect(ui.activeTab).toContainText('Idées');
  await expect(ui.tabs).toHaveCount(1);
});

recette('10.3', async ({ app, ui }) => {
  await openAway(app, ui, 'Voir [[Idées]] ici');
  await link(ui, 'Idées').click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.activeTab).toContainText('Idées');
});

recette('10.4', async ({ app, ui }) => {
  await app.start({ vault: vault('Voir [[Idées]] ici\nfin') });
  await ui.open('Essai');
  await ui.gotoLine(0);
  await ui.editor.locator('.cm-line').first().getByText('Idées').click();
  await expect(ui.activeTab).toContainText('Essai');
  await ui.editor
    .locator('.cm-line')
    .first()
    .getByText('Idées')
    .click({ modifiers: ['Control'] });
  await expect(ui.activeTab).toContainText('Idées');
});

recette('10.5', async ({ app, ui }) => {
  await openAway(app, ui, 'Voir [[Idées|mes pistes]] ici');
  await expect(ui.lines.first()).toHaveText('Voir mes pistes ici');
});

recette('10.6', async ({ app, ui }) => {
  await openAway(app, ui, 'Aller à [[Plan#Suite]]');
  await link(ui, 'Plan').click();
  await expect(ui.activeTab).toContainText('Plan');
  await expect(ui.lines.filter({ hasText: /^Suite$/ })).toBeInViewport();
});

recette('10.7', async ({ app, ui }) => {
  await openAway(app, ui, 'Aller au [[Plan#^bloc-un]]');
  await link(ui, 'Plan').click();
  await expect(ui.activeTab).toContainText('Plan');
  await expect(ui.lines.filter({ hasText: 'Un bloc précis' })).toBeInViewport();
});

recette('10.8', async ({ app, ui }) => {
  await openAway(app, ui, `Aller à [[#Bas]]\nligne suivante${long}\n\n## Bas\n\nle bas`);
  // The cursor on the line below the link, at the top of the note.
  await ui.gotoLine(1);
  await link(ui, 'Bas').click();
  await expect(ui.lines.filter({ hasText: /^(## )?Bas$/ })).toBeInViewport();
});

recette('10.9', async ({ app, ui }) => {
  await openAway(app, ui, 'Voir [[Pas encore là]] ici');
  const missing = link(ui, 'Pas encore là');
  expect(await missing.evaluate((el) => getComputedStyle(el).textDecorationStyle)).toBe('dashed');
  const settings = await ui.settings();
  await settings.locator('#set-newfolder').selectOption('folder:Journal');
  await ui.tab('Essai').click();
  await missing.click();
  await expect(ui.activeTab).toContainText('Pas encore là');
  await expect.poll(() => app.exists('Journal/Pas encore là.md')).toBe(true);
});

recette('10.10', async ({ app, ui }) => {
  await openAway(app, ui, 'Voir [[Archives/Plus tard]] ici');
  await link(ui, 'Plus tard').click();
  await expect.poll(() => app.exists('Archives/Plus tard.md')).toBe(true);
});

recette('10.11', async ({ app, ui }) => {
  await openAway(app, ui, 'Voir [mes idées](Idées.md) ici');
  await link(ui, 'mes idées').click();
  await expect(ui.activeTab).toContainText('Idées');
});

recette('10.12', async ({ app, ui }) => {
  await openAway(app, ui, 'Voir [le site](https://example.org/page) ici');
  const external = ui.editor.locator('.cm-external-link').first();
  const arrow = await external.evaluate((el) => getComputedStyle(el, '::after').content);
  expect(arrow).not.toBe('none');
  if (app.desktop) {
    await app.electron.evaluate(({ shell }) => {
      (globalThis as { __external?: string[] }).__external = [];
      shell.openExternal = async (url: string) => void (globalThis as { __external?: string[] }).__external!.push(url);
    });
    await external.click();
    await expect
      .poll(() => app.electron.evaluate(() => (globalThis as { __external?: string[] }).__external))
      .toEqual(['https://example.org/page']);
  } else {
    const [popup] = await Promise.all([ui.page.waitForEvent('popup'), external.click()]);
    expect(popup.url()).toContain('example.org/page');
  }
});

recette('10.13', async ({ app, ui }) => {
  await openAway(app, ui, '![[image.png]]');
  const img = ui.editor.locator('.cm-embed img');
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1);
});

recette('10.14', async ({ app, ui }) => {
  await openAway(app, ui, '![[image.png|200]]\n\n![[image.png|200x100]]');
  const imgs = ui.editor.locator('.cm-embed img');
  await expect(imgs).toHaveCount(2);
  expect(await imgs.nth(0).evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(200);
  expect(
    await imgs
      .nth(1)
      .evaluate((el) => [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)]),
  ).toEqual([200, 100]);
});

recette('10.15', async ({ app, ui }) => {
  // A picture served over the network, by a small server of the test.
  const { createServer } = await import('node:http');
  const server = createServer((_req, res) => res.writeHead(200, { 'content-type': 'image/png' }).end(Buffer.from(PNG)));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  try {
    await openAway(app, ui, `![logo](http://127.0.0.1:${port}/logo.png)`);
    const img = ui.editor.locator('.cm-embed img');
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1);
  } finally {
    server.close();
  }
});

recette('10.16', async ({ app, ui }) => {
  await openAway(app, ui, 'avant\n\n![[Idées]]\n\naprès');
  const embed = ui.editor.locator('.cm-embed-note');
  await expect(embed).toContainText('Le plan avance');
  const head = embed.locator('.embed-header');
  await expect(head).toHaveText('Idées');
  expect(await head.evaluate((el) => getComputedStyle(el).textTransform)).toBe('uppercase');
  await head.click();
  await expect(ui.activeTab).toContainText('Idées');
});

recette('10.17', async ({ app, ui }) => {
  await openAway(app, ui, '![[Plan#Suite]]\n\n![[Plan#^bloc-un]]');
  const embeds = ui.editor.locator('.cm-embed-note');
  await expect(embeds).toHaveCount(2);
  await expect(embeds.nth(0)).toContainText('La suite du plan');
  await expect(embeds.nth(0)).not.toContainText('Paragraphe de remplissage');
  await expect(embeds.nth(1)).toContainText('Un bloc précis');
  await expect(embeds.nth(1)).not.toContainText('La suite du plan');
});

recette('10.18', async ({ app, ui }) => {
  await openAway(app, ui, '![[manuel.pdf]]\n\n![[son.mp3]]\n\n![[film.mp4]]');
  await expect(ui.editor.locator('.cm-embed iframe.cm-embed-pdf')).toHaveCount(1);
  await expect(ui.editor.locator('.cm-embed audio[controls]')).toHaveCount(1);
  await expect(ui.editor.locator('.cm-embed video[controls]')).toHaveCount(1);
});

recette('10.19', async ({ app, ui }) => {
  await openAway(app, ui, '![[Inexistant.png]]');
  const missing = ui.editor.locator('.cm-embed-missing');
  await expect(missing).toContainText('Inexistant.png');
  expect(
    await missing.evaluate((el) => getComputedStyle(el).textDecorationStyle + getComputedStyle(el).borderBottomStyle),
  ).toMatch(/dashed|dotted/);
});

recette('10.20', async ({ app, ui }) => {
  await openAway(app, ui, 'avant\n\n![[Idées]]\n\naprès');
  await ui.editor.locator('.cm-embed-note').click({ position: { x: 200, y: 60 } });
  await expect(ui.editor).toContainText('![[Idées]]');
});

recette('10.21', async ({ app, ui }) => {
  await openAway(app, ui, 'Moi-même :\n\n![[Essai]]');
  await expect(ui.editor.locator('.cm-embed')).toContainText('Cette note s’intègre elle-même');
});

recette('10.22', async ({ app, ui }) => {
  await openAway(app, ui, 'Un #sujet ici');
  const tag = ui.editor.locator('.cm-tag', { hasText: '#sujet' });
  expect(await tag.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  await tag.click();
  await expect(ui.find).toHaveValue('tag:#sujet');
});

recette('10.23', async ({ app, ui }) => {
  await openAway(app, ui, 'Numéro #123 et #a1');
  await expect(ui.editor.locator('.cm-tag')).toHaveText(['#a1']);
});

recette('10.24', async ({ app, ui }) => {
  await app.start({ vault: vault('---\nstatut: actif\ntags: [un, deux]\n---\nTexte\n\nfin') });
  await ui.open('Essai');
  await ui.editEnd();
  const card = ui.editor.locator('.cm-properties');
  await expect(card.locator('.cm-properties-title')).toHaveText(/propriétés/i);
  await expect(card).toContainText('actif');
  await expect(card.locator('.cm-property-tag')).toHaveText(['#un', '#deux']);
});

recette('10.25', async ({ app, ui }) => {
  await app.start({ vault: vault('---\nstatut: actif\n---\nTexte\n\nfin') });
  await ui.open('Essai');
  await ui.editEnd();
  await ui.editor.locator('.cm-properties').click();
  await expect(ui.editor).toContainText('statut: actif');
  await ui.editEnd();
  await expect(ui.editor.locator('.cm-properties')).toBeVisible();
});

recette('10.26', async ({ app, ui }) => {
  await app.start({ vault: vault('---\nstatut: [pas fermé\n---\nTexte\n\nfin') });
  await ui.open('Essai');
  await ui.editEnd();
  const error = ui.editor.locator('.cm-properties-error');
  await expect(error).toBeVisible();
  expect(await error.evaluate((el) => getComputedStyle(el).color)).toMatch(/rgb\((200|241|192), /);
});

recette('10.27', async ({ app, ui }) => {
  await app.start({ vault: vault('Première ligne\nDeuxième ligne') });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.press('Control+Home');
  await ui.page.keyboard.type('---\n');
  await expect(ui.editor.locator('.cm-properties')).toHaveCount(0);
  await expect(ui.editor).toContainText('Première ligne');
  await expect(ui.editor).toContainText('Deuxième ligne');
});
