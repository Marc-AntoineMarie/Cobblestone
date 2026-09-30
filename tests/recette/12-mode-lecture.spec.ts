import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 12. Mode lecture.

const RICH = `# Titre

## Sous-titre

- un
- deux

1. premier
2. second

| Col A | Col B |
| ----- | ----- |
| a     | b     |

\`\`\`js
const x = 1;
\`\`\`

> Une citation

> [!tip] Astuce
> Contenu de l'astuce

Formule $x^2$ et bloc :

$$
\\frac{a}{b}
$$

![[image.png]]

- [ ] à faire
`;

async function reading(app: Cobble, ui: Ui, text: string, extra = {}) {
  await app.start({ vault: baseVault({ 'Essai.md': text, ...extra }), viewport: { width: 1600, height: 900 } });
  await ui.open('Essai');
  await ui.mode('Lire');
  await expect(ui.reading).toBeVisible();
}

recette('12.1', async ({ app, ui }) => {
  await reading(app, ui, RICH);
  const r = ui.reading;
  await expect(r.locator('h1')).toHaveText('Titre');
  await expect(r.locator('h2')).toHaveText('Sous-titre');
  await expect(r.locator('ul li')).toContainText(['un', 'deux']);
  await expect(r.locator('ol li')).toHaveCount(2);
  // "Petites capitales": small uppercase letters.
  const th = await r
    .locator('th')
    .first()
    .evaluate((el) => [getComputedStyle(el).textTransform, parseFloat(getComputedStyle(el).fontSize)]);
  const body = await r
    .locator('p')
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(th[0]).toBe('uppercase');
  expect(th[1]).toBeLessThan(body);
  await expect(r.locator('pre code')).toContainText('const x = 1;');
  await expect(r.locator('blockquote')).toContainText('Une citation');
  await expect(r.locator('.callout[data-callout="tip"]')).toContainText('Astuce');
  await expect(r.locator('.math .katex').first()).toBeVisible();
  await expect(r.locator('.katex-display')).toBeVisible();
  await expect(r.locator('.internal-embed img')).toBeVisible();
});

recette('12.2', async ({ app, ui }) => {
  await reading(app, ui, '- [ ] à faire\n- [ ] autre');
  await ui.reading.locator('input.task-list-item-checkbox').first().click();
  await expect.poll(() => app.read('Essai.md')).toBe('- [x] à faire\n- [ ] autre');
  const done = ui.reading.locator('li', { hasText: 'à faire' });
  expect(
    await done.evaluate(
      (el) => getComputedStyle(el).textDecorationLine + getComputedStyle(el.querySelector('p') ?? el).textDecorationLine,
    ),
  ).toContain('line-through');
});

recette('12.3', async ({ app, ui }) => {
  await reading(app, ui, '> [!note]- Replié\n> caché\n');
  const callout = ui.reading.locator('.callout');
  const title = callout.locator('.callout-title');
  await expect(callout).toHaveClass(/is-collapsed/);
  await title.click();
  await expect(callout).not.toHaveClass(/is-collapsed/);
  await title.focus();
  await ui.page.keyboard.press('Enter');
  await expect(callout).toHaveClass(/is-collapsed/);
  await ui.page.keyboard.press(' ');
  await expect(callout).not.toHaveClass(/is-collapsed/);
});

recette('12.4', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[Idées]], #sujet et [site](https://example.org).');
  await ui.reading.locator('a.internal-link').click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
  await ui.tab('Essai').click();
  await ui.reading.locator('a.tag').click();
  await expect(ui.find).toHaveValue('tag:#sujet');
  await ui.reading.locator('a.internal-link').click();
  await expect(ui.activeTab).toContainText('Idées');
});

recette('12.5', async ({ app, ui }) => {
  await reading(app, ui, '![[Tâches]]', { 'Tâches.md': '- [ ] intégrée' });
  const embed = ui.reading.locator('.internal-embed.is-note');
  await expect(embed.locator('input.task-list-item-checkbox')).toBeDisabled();
  await embed.locator('.embed-header').click();
  await expect(ui.activeTab).toContainText('Tâches');
});

recette('12.6', async ({ app, ui }) => {
  await reading(app, ui, '```mermaid\ngraph TD\n  A --> B\n```');
  const svg = ui.reading.locator('.mermaid-diagram svg');
  await expect(svg).toBeVisible({ timeout: 15_000 });
  const day = await svg
    .locator('.node rect, .node polygon')
    .first()
    .evaluate((el) => getComputedStyle(el).fill);
  await ui.command('Basculer entre papier de jour et de nuit');
  await expect
    .poll(
      () =>
        svg
          .locator('.node rect, .node polygon')
          .first()
          .evaluate((el) => getComputedStyle(el).fill),
      { timeout: 15_000 },
    )
    .not.toBe(day);
});

recette('12.7', async ({ app, ui }) => {
  await reading(app, ui, '```mermaid\ngraph TD\n  A -->\n```');
  const block = ui.reading.locator('.mermaid-diagram');
  await expect(block).toHaveClass(/is-error/, { timeout: 15_000 });
  expect(await block.evaluate((el) => getComputedStyle(el).color)).toMatch(/rgb\((200|241|192), /);
});

recette('12.8', async ({ app, ui }) => {
  await reading(app, ui, 'Une note[^1].\n\n[^1]: La précision.');
  await expect(ui.reading.locator('sup a, .footnote-ref a').first()).toBeVisible();
  await expect(ui.reading.locator('.footnotes, section.footnotes')).toContainText('La précision.');
});

recette('12.9', async ({ app, ui }) => {
  await reading(app, ui, '<details><summary>Plus</summary>Caché</details>\n\n<b>gras</b>\n\n<script>window.__piege = 1</script>');
  await expect(ui.reading.locator('details summary')).toHaveText('Plus');
  await expect(ui.reading.locator('b')).toHaveText('gras');
  await expect(ui.reading.locator('script')).toHaveCount(0);
  expect(await ui.page.evaluate(() => (window as { __piege?: number }).__piege)).toBeUndefined();
});

recette('12.10', async ({ app, ui }) => {
  const long = Array.from({ length: 80 }, (_, i) => `Paragraphe ${i}.`).join('\n\n');
  await reading(app, ui, long);
  await ui.page.keyboard.press('Control+\\');
  const left = ui.panes.nth(0);
  await left.locator('.note-scroll').evaluate((el) => (el.scrollTop = 1500));
  const right = ui.panes.nth(1);
  await right.getByRole('button', { name: 'Écrire', exact: true }).click();
  await right.locator('.cm-content').click();
  await ui.page.keyboard.press('Control+Home');
  await ui.page.keyboard.type('Ajout en tête. ');
  await expect(left.locator('.reading-view')).toContainText('Ajout en tête.');
  expect(await left.locator('.note-scroll').evaluate((el) => el.scrollTop)).toBeGreaterThan(1200);
});

recette('12.11', async ({ app, ui }) => {
  await reading(app, ui, 'ligne un\nligne deux');
  await expect(ui.reading.locator('p br')).toHaveCount(1);
  const settings = await ui.settings();
  await settings.locator('#set-breaks').click();
  await ui.tab('Essai').click();
  await expect(ui.reading.locator('p br')).toHaveCount(0);
});

recette('12.12', async ({ app, ui }) => {
  await reading(app, ui, 'Un texte assez long pour remplir la ligne. '.repeat(20));
  const narrow = (await ui.reading.boundingBox())!.width;
  const settings = await ui.settings();
  await settings.getByRole('radio', { name: 'Toute la largeur' }).click();
  await ui.tab('Essai').click();
  await expect.poll(async () => (await ui.reading.boundingBox())!.width).toBeGreaterThan(narrow + 50);
  await ui.mode('Écrire');
  const editor = (await ui.editor.boundingBox())!.width;
  expect(editor).toBeGreaterThan(narrow + 50);
});
