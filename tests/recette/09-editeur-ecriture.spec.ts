import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Ui } from './lib/ui';

// 9. Éditeur : écriture et mise en forme.

const note = (text: string) => baseVault({ 'Essai.md': text });
const line = (ui: Ui, text: string | RegExp) => ui.lines.filter({ hasText: text }).first();
/** Moves the cursor away to the last line, so the other lines show their rendering. */
const away = (ui: Ui) => ui.editEnd();

async function selectWord(ui: Ui, n: number, length: number) {
  await ui.gotoLine(n);
  await ui.page.keyboard.press('Home');
  for (let i = 0; i < length; i++) await ui.page.keyboard.press('Shift+ArrowRight');
}

recette('9.1', async ({ app, ui }) => {
  await app.start({ vault: note('') });
  await ui.open('Essai');
  await ui.editor.click();
  const cursor = ui.pane.locator('.cm-cursor').first();
  await expect(cursor).toBeAttached();
  expect(await cursor.evaluate((el) => getComputedStyle(el).borderLeftColor)).toBe('rgb(255, 72, 176)');
  await ui.page.keyboard.type('Première phrase.');
  await expect.poll(() => app.read('Essai.md'), { timeout: 3000 }).toBe('Première phrase.');
});

recette('9.2', async ({ app, ui }) => {
  await app.start({ vault: note('') });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.type('Tapé puis fermé aussitôt');
  await app.restart();
  await expect.poll(() => app.readOr('Essai.md')).toBe('Tapé puis fermé aussitôt');
});

recette('9.3', async ({ app, ui }) => {
  await app.start({ vault: note('début') });
  await ui.open('Essai');
  await ui.append(' suite');
  await expect(ui.editor).toContainText('début suite');
  await ui.page.keyboard.press('Control+z');
  await expect(ui.editor).not.toContainText('suite');
  await ui.page.keyboard.press('Control+Shift+z');
  await expect(ui.editor).toContainText('début suite');
  await ui.page.keyboard.press('Control+z');
  await ui.page.keyboard.press('Control+y');
  await expect(ui.editor).toContainText('début suite');
});

recette('9.4', async ({ app, ui }) => {
  await app.start({ vault: note('un deux trois') });
  await ui.open('Essai');
  await selectWord(ui, 0, 7);
  const color = await ui.pane
    .locator('.cm-selectionBackground')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(color).toMatch(/255, 72, 176|srgb 1 0\.28/);
});

recette('9.5', async ({ app, ui }) => {
  await app.start({ vault: note('# Un\n## Deux\n### Trois\n#### Quatre\n##### Cinq\n###### Six\nfin') });
  await ui.open('Essai');
  await away(ui);
  const sizes: number[] = [];
  for (let level = 1; level <= 6; level++) {
    const heading = ui.lines.and(ui.page.locator(`.cm-h${level}`));
    await expect(heading).not.toContainText('#');
    sizes.push(await heading.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)));
  }
  expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  expect(sizes[0]).toBeGreaterThan(sizes[5]!);
  await ui.gotoLine(0);
  await expect(ui.page.locator('.cm-h1')).toContainText('#');
});

recette('9.6', async ({ app, ui }) => {
  await app.start({ vault: note('Du **gras** ici\nmot\nfin') });
  await ui.open('Essai');
  await away(ui);
  await expect(ui.editor.locator('.cm-strong')).toHaveText('gras');
  await selectWord(ui, 1, 3);
  await ui.page.keyboard.press('Control+b');
  await expect.poll(() => app.read('Essai.md')).toContain('**mot**');
  await ui.page.keyboard.press('Control+b');
  await expect.poll(() => app.read('Essai.md')).toContain('\nmot\n');
});

recette('9.7', async ({ app, ui }) => {
  await app.start({ vault: note('De l’*italique*\nmot\nfin') });
  await ui.open('Essai');
  await away(ui);
  await expect(ui.editor.locator('.cm-em')).toHaveText('italique');
  await selectWord(ui, 1, 3);
  await ui.page.keyboard.press('Control+i');
  await expect.poll(() => app.read('Essai.md')).toContain('*mot*');
  await ui.page.keyboard.press('Control+i');
  await expect.poll(() => app.read('Essai.md')).toContain('\nmot\n');
});

recette('9.8', async ({ app, ui }) => {
  await app.start({ vault: note('Du ==surligné==\nmot\nfin') });
  await ui.open('Essai');
  await away(ui);
  const mark = ui.editor.locator('.cm-highlight');
  await expect(mark).toHaveText('surligné');
  expect(await mark.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/255, 232, 0|srgb 1 0\.9/);
  await selectWord(ui, 1, 3);
  await ui.page.keyboard.press('Control+Shift+h');
  await expect.poll(() => app.read('Essai.md')).toContain('==mot==');
});

recette('9.9', async ({ app, ui }) => {
  await app.start({ vault: note('Du ~~barré~~\nmot\nfin') });
  await ui.open('Essai');
  await away(ui);
  const strike = ui.editor.locator('.cm-strike');
  await expect(strike).toHaveText('barré');
  expect(await strike.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain('line-through');
  await selectWord(ui, 1, 3);
  await ui.page.keyboard.press('Control+Shift+x');
  await expect.poll(() => app.read('Essai.md')).toContain('~~mot~~');
});

recette('9.10', async ({ app, ui }) => {
  await app.start({ vault: note('Du `code` ici\nfin') });
  await ui.open('Essai');
  await away(ui);
  const code = ui.editor.locator('.cm-inline-code');
  await expect(code).toHaveText('code');
  const style = await code.evaluate((el) => [getComputedStyle(el).fontFamily, getComputedStyle(el).backgroundColor]);
  expect(style[0]).toMatch(/Mono|monospace/i);
  expect(style[1]).not.toBe('rgba(0, 0, 0, 0)');
});

recette('9.11', async ({ app, ui }) => {
  await app.start({ vault: note('Du **gras**, du ==jaune== et du `code`\nfin') });
  await ui.open('Essai');
  await away(ui);
  const first = ui.lines.first();
  await expect(first).toHaveText('Du gras, du jaune et du code');
  await ui.gotoLine(0);
  await expect(first).toHaveText('Du **gras**, du ==jaune== et du `code`');
  const marker = first.locator('.tok-mark').first();
  expect(await marker.evaluate((el) => getComputedStyle(el).color)).not.toBe(
    await first.evaluate((el) => getComputedStyle(el).color),
  );
});

recette('9.12', async ({ app, ui }) => {
  await app.start({ vault: note('Du **gras** ici\n# Titre') });
  await ui.open('Essai');
  await ui.gotoLine(0);
  await expect(ui.lines.first()).toContainText('**');
  await ui.find.click();
  await expect(ui.lines.first()).not.toContainText('**');
  await expect(ui.lines.nth(1)).not.toContainText('#');
});

recette('9.13', async ({ app, ui }) => {
  await app.start({ vault: note('') });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.type('- un');
  await ui.page.keyboard.press('Enter');
  await ui.page.keyboard.type('deux');
  await ui.page.keyboard.press('Enter');
  await ui.page.keyboard.press('Enter');
  await ui.page.keyboard.type('après');
  // The empty item loses its marker: the list stops (as in Obsidian, no blank line is added).
  await expect.poll(() => app.read('Essai.md')).toBe('- un\n- deux\naprès');
});

recette('9.14', async ({ app, ui }) => {
  await app.start({ vault: note('- un\n- deux') });
  await ui.open('Essai');
  await ui.editEnd();
  await ui.page.keyboard.press('Tab');
  await expect.poll(() => app.read('Essai.md')).toMatch(/^- un\n\s+- deux$/);
  await ui.page.keyboard.press('Shift+Tab');
  await expect.poll(() => app.read('Essai.md')).toBe('- un\n- deux');
});

recette('9.15', async ({ app, ui }) => {
  await app.start({ vault: note('- un\n- deux\nfin') });
  await ui.open('Essai');
  await away(ui);
  await expect(ui.editor.locator('.cm-bullet')).toHaveCount(2);
  await expect(ui.lines.first()).not.toContainText('-');
});

recette('9.16', async ({ app, ui }) => {
  await app.start({ vault: note('') });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.type('1. un');
  await ui.page.keyboard.press('Enter');
  await ui.page.keyboard.type('deux');
  await expect.poll(() => app.read('Essai.md')).toBe('1. un\n2. deux');
});

recette('9.17', async ({ app, ui }) => {
  await app.start({ vault: note('- [ ] acheter du pain\nfin') });
  await ui.open('Essai');
  await away(ui);
  const box = ui.editor.locator('.cm-task-checkbox');
  await expect(box).toHaveCount(1);
  await box.click();
  await expect.poll(() => app.read('Essai.md')).toContain('- [x] acheter du pain');
  await expect(ui.editor.locator('.cm-task-done')).toContainText('acheter du pain');
});

recette('9.18', async ({ app, ui }) => {
  await app.start({ vault: note('texte') });
  await ui.open('Essai');
  await ui.gotoLine(0);
  await ui.page.keyboard.press('Control+l');
  await expect.poll(() => app.read('Essai.md')).toBe('- [ ] texte');
  await ui.page.keyboard.press('Control+l');
  await expect.poll(() => app.read('Essai.md')).toBe('- [x] texte');
  await ui.page.keyboard.press('Control+l');
  await expect.poll(() => app.read('Essai.md')).toBe('- [ ] texte');
});

recette('9.19', async ({ app, ui }) => {
  await app.start({ vault: note('- [-] annulé\n- [/] en cours\nfin') });
  await ui.open('Essai');
  await away(ui);
  const boxes = ui.editor.locator('.cm-task-checkbox');
  await expect(boxes).toHaveCount(2);
  for (const i of [0, 1]) await expect(boxes.nth(i)).toBeChecked();
  await expect(ui.editor.locator('.cm-task-done')).toHaveCount(2);
});

recette('9.20', async ({ app, ui }) => {
  await app.start({ vault: note('> une citation\nfin') });
  await ui.open('Essai');
  await away(ui);
  const quote = ui.lines.and(ui.page.locator('.cm-quote')).first();
  await expect(quote).toContainText('une citation');
  const [image, color, text] = await quote.evaluate((el) => {
    const s = getComputedStyle(el);
    const bar = getComputedStyle(el, '::before');
    return [
      s.backgroundImage + s.borderLeftStyle + bar.backgroundImage + bar.borderLeftStyle,
      s.color,
      getComputedStyle(document.querySelector('.cm-content')!).color,
    ];
  });
  expect(image).toMatch(/gradient|dotted|url/);
  expect(color).not.toBe(text);
});

recette('9.21', async ({ app, ui }) => {
  const types = ['tip', 'warning', 'danger', 'note', 'question', 'quote'];
  await app.start({ vault: note(types.map((t) => `> [!${t}] Titre ${t}\n> contenu`).join('\n\n') + '\n\nfin') });
  await ui.open('Essai');
  await away(ui);
  const badges = ui.editor.locator('.cm-callout-badge');
  await expect(badges).toHaveCount(6);
  const colors = new Set<string>();
  for (const t of types) {
    const badge = badges.filter({ hasText: new RegExp(t, 'i') }).first();
    await expect(badge).toBeVisible();
    colors.add(await badge.evaluate((el) => getComputedStyle(el.closest('.cm-line')!).backgroundColor));
  }
  expect(colors.size).toBe(6);
});

recette('9.22', async ({ app, ui }) => {
  await app.start({ vault: note('> [!note]- Titre replié\n> contenu caché\n\nfin') });
  await ui.open('Essai');
  await away(ui);
  await expect(ui.editor).toContainText('contenu caché');
  await ui.mode('Lire');
  await expect(ui.reading.getByText('contenu caché')).toBeHidden();
  await expect(ui.reading).toContainText('Titre replié');
});

recette('9.23', async ({ app, ui }) => {
  const blocks = [
    ['js', 'const x = 1;'],
    ['python', 'def f():\n    return 1'],
    ['css', 'a { color: red; }'],
    ['bash', 'echo "salut"'],
  ];
  await app.start({ vault: note(blocks.map(([l, c]) => '```' + l + '\n' + c + '\n```').join('\n\n') + '\n\nfin') });
  await ui.open('Essai');
  await away(ui);
  const code = ui.lines.and(ui.page.locator('.cm-codeblock'));
  expect(await code.count()).toBeGreaterThan(4);
  await expect(ui.editor.locator('.cm-codeblock .tok-keyword').first()).toBeVisible();
  expect(await code.first().evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
});

recette('9.24', async ({ app, ui }) => {
  await app.start({ vault: note('avant\n\n---\n\naprès') });
  await ui.open('Essai');
  await away(ui);
  await expect(ui.editor.locator('.cm-hr')).toHaveCount(1);
});

recette('9.25', async ({ app, ui }) => {
  await app.start({ vault: note('Formule $x^2$ ici\nfin') });
  await ui.open('Essai');
  await away(ui);
  await expect(ui.editor.locator('.cm-math-inline .katex')).toBeVisible();
  await ui.gotoLine(0);
  await expect(ui.lines.first()).toContainText('$x^2$');
});

recette('9.26', async ({ app, ui }) => {
  await app.start({ vault: note('avant\n$$\n\\frac{a}{b}\n$$\naprès') });
  await ui.open('Essai');
  await away(ui);
  const block = ui.editor.locator('.cm-math-block');
  await expect(block.locator('.katex-display')).toBeVisible();
  expect(await block.evaluate((el) => getComputedStyle(el).textAlign)).toBe('center');
  await block.click();
  await expect(ui.editor).toContainText('\\frac{a}{b}');
});

recette('9.27', async ({ app, ui }) => {
  await app.start({ vault: note('Du texte %%caché%% ici\n\n%%\nbloc caché\n%%\n\nfin') });
  await ui.open('Essai');
  await away(ui);
  const inline = ui.editor.locator('.cm-comment').first();
  const style = await inline.evaluate((el) => [getComputedStyle(el).fontStyle, getComputedStyle(el).color]);
  expect(style[0]).toBe('italic');
  await expect(ui.lines.and(ui.page.locator('.cm-comment-line')).first()).toBeVisible();
});

recette('9.28', async ({ app, ui }) => {
  await app.start({ vault: note('Un paragraphe ^mon-bloc\nfin') });
  await ui.open('Essai');
  await away(ui);
  const id = ui.editor.locator('.cm-block-id');
  await expect(id).toContainText('^mon-bloc');
  const [size, text] = await id.evaluate((el) => [
    parseFloat(getComputedStyle(el).fontSize),
    parseFloat(getComputedStyle(el.closest('.cm-line')!).fontSize),
  ]);
  expect(size).toBeLessThan(text!);
});

recette('9.29', async ({ app, ui }) => {
  await app.start({ vault: note('| a | b |\n| - | - |\n| 1 | 2 |\n\nfin') });
  await ui.open('Essai');
  await away(ui);
  await expect(ui.lines.first()).toHaveText('| a | b |');
});

recette('9.30', async ({ app, ui }) => {
  await app.start({ vault: note('chercher ici') });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.press('Control+f');
  const panel = ui.pane.locator('.cm-search');
  await expect(panel).toBeVisible();
  await expect(panel.locator('input[name="search"]')).toBeVisible();
  await expect(panel.locator('input[name="replace"]')).toBeVisible();
  for (const name of ['next', 'prev', 'replace']) await expect(panel.locator(`button[name="${name}"]`)).toBeVisible();
  for (const name of ['case', 're']) await expect(panel.locator(`input[name="${name}"]`)).toBeVisible();
});

recette('9.31', async ({ app, ui }) => {
  await app.start({ vault: note('une fote') });
  await ui.open('Essai');
  await expect(ui.editor).toHaveAttribute('spellcheck', 'true');
  const settings = await ui.settings();
  await settings.locator('#set-spell').click();
  await ui.tab('Essai').click();
  await expect(ui.editor).toHaveAttribute('spellcheck', 'false');
});

recette('9.32', async ({ app, ui }) => {
  await app.start({ vault: note('') });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.editor.evaluate((el) => {
    const data = new DataTransfer();
    data.setData('text/html', '<p><b>gras</b> du <a href="https://example.org">web</a></p>');
    data.setData('text/plain', 'gras du web');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect.poll(() => app.read('Essai.md')).toBe('gras du web');
});

recette('9.33', async ({ app, ui }) => {
  const long = Array.from({ length: 5000 }, (_, i) => `Ligne ${i} avec un peu de **texte** et un [[lien]].`).join('\n');
  await app.start({ vault: note(long) });
  await ui.open('Essai');
  // At the start of the text: a click in the middle could land on one of its links.
  await ui.editor.click({ position: { x: 4, y: 4 } });
  const start = Date.now();
  await ui.page.keyboard.type('frappe rapide', { delay: 15 });
  expect(Date.now() - start).toBeLessThan(2500);
  await ui.page.keyboard.press('Control+End');
  await expect(ui.lines.filter({ hasText: 'Ligne 4999' })).toBeVisible();
});

recette('9.34', async ({ app, ui }) => {
  await app.start({ vault: note('ligne un\r\nligne deux\r\n') });
  await ui.open('Essai');
  await expect(ui.lines.nth(0)).toHaveText('ligne un');
  await expect(ui.lines.nth(1)).toHaveText('ligne deux');
  await ui.gotoLine(1);
  await ui.page.keyboard.type(' modifiée');
  await expect.poll(() => app.read('Essai.md')).toMatch(/^ligne un\r?\nligne deux modifiée\r?\n$/);
});
