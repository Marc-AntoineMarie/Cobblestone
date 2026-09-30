import type { Locator, Page } from '@playwright/test';
import { expect, recette } from './lib/recette';
import { baseVault, obsidianVault } from './lib/vaults';

// 25. Apparence et tailles d'écran.

const colors = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const body = getComputedStyle(document.body);
    return { paper: body.backgroundColor, ink: body.color, grain: body.backgroundImage };
  });

recette('25.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  const c = await colors(ui.page);
  expect(c.paper).toBe('rgb(244, 244, 240)');
  expect(c.ink).toBe('rgb(30, 42, 79)');
  expect(c.grain).toContain('url(');
});

recette('25.2', async ({ app, ui }) => {
  await app.start({
    vault: baseVault({ 'Mark.md': 'Du ==surligné== ici\n\nfin' }),
    preferences: { theme: 'night', language: 'auto' },
  });
  const c = await colors(ui.page);
  expect(c.paper).toBe('rgb(21, 25, 42)');
  expect(c.ink).toBe('rgb(236, 235, 228)');
  await ui.open('Mark');
  await ui.editEnd();
  const mark = ui.editor.locator('.cm-highlight');
  const [bg, fg] = await mark.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color]);
  expect(bg).not.toBe(fg);
});

recette('25.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+\\');
  await ui.row('Tableau.canvas').click();
  await ui.page.keyboard.press('Control+g');
  const backgrounds = () =>
    ui.page.evaluate(() =>
      ['.note-view', '.canvas-view', '.graph-view'].map((s) => {
        const el = document.querySelector(s);
        return el ? getComputedStyle(el).backgroundColor + getComputedStyle(el).color : 'absent';
      }),
    );
  const day = await backgrounds();
  await ui.command('Basculer entre papier de jour et de nuit');
  await expect(ui.page.locator('html')).toHaveAttribute('data-paper', 'night');
  const night = await backgrounds();
  day.forEach((value, i) => expect(night[i]).not.toBe(value));
});

recette('25.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.locator('body').click({ position: { x: 1, y: 1 } });
  const missing: string[] = [];
  for (let i = 0; i < 40; i++) {
    await ui.page.keyboard.press('Tab');
    const ring = await ui.page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return 'body';
      const s = getComputedStyle(el);
      const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow.includes('255, 72, 176');
      const pink = /255, 72, 176|srgb 1 0\.28/.test(s.outlineColor + s.boxShadow);
      return visible && pink ? 'ok' : `${el.tagName}.${el.className}`;
    });
    if (ring !== 'ok' && ring !== 'body' && !ring.startsWith('DIV.cm-content')) missing.push(ring);
  }
  expect(missing).toEqual([]);
});

recette('25.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), viewport: { width: 1100, height: 760 } });
  await ui.open('Idées');
  await ui.noteBar.getByRole('button', { name: 'Afficher la marge' }).click();
  await expect(ui.margin).toHaveClass(/is-drawer/);
});

recette('25.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), viewport: { width: 700, height: 800 } });
  await ui.open('Plan');
  await expect(ui.rail).toHaveCount(0);
  await expect(ui.margin).toHaveCount(0);
  await ui.pane.locator('.tab-rail').click();
  await expect(ui.rail).toHaveClass(/is-drawer/);
  await expect(ui.page.locator('.scrim')).toBeVisible();
  await ui.page.locator('.scrim').click({ position: { x: 650, y: 400 } });
  await expect(ui.rail).toHaveCount(0);
  const crumbs = await ui.view.locator('.note-crumbs .crumb:visible').allTextContents();
  expect(crumbs).toEqual(['Plan']);
});

recette('25.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Plan');
  for (const width of [1400, 1180, 1000, 900, 760, 600, 420, 360]) {
    await app.resize({ width, height: 800 });
    expect(await ui.overflowsSideways(), `à ${width} px`).toBe(false);
  }
});

recette('25.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.emulateMedia({ reducedMotion: 'reduce' });
  await ui.page.keyboard.press('Control+k');
  const animation = await ui.palette.evaluate((el) => {
    const s = getComputedStyle(el);
    return [s.animationName, s.animationDuration];
  });
  expect(animation[0] === 'none' || parseFloat(animation[1]!) <= 0.01).toBe(true);
});

recette(
  '25.9',
  async ({ app, ui }) => {
    await app.start({ vault: baseVault() });
    await ui.open('Plan');
    for (const factor of [1.5, 0.75]) {
      await app.electron.evaluate(
        ({ BrowserWindow }, f) => BrowserWindow.getAllWindows()[0]!.webContents.setZoomFactor(f),
        factor,
      );
      await ui.page.waitForTimeout(300);
      expect(await ui.overflowsSideways()).toBe(false);
      await expect(ui.title).toBeVisible();
    }
  },
  { seulement: ['bureau'] },
);
recette.manuel('25.9', 'le zoom du navigateur (Ctrl+plus) ne se commande pas depuis un test', { seulement: ['web'] });

/** A theme's card in the settings, by the start of its name. */
const card = (settings: Locator, name: string) => settings.getByRole('radio', { name: new RegExp(`^${name}`) });
const css = (page: Page, selector: string, property: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

recette('25.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  const settings = await ui.settings();
  const day = settings.getByRole('radiogroup', { name: 'Thème de jour' });
  const night = settings.getByRole('radiogroup', { name: 'Thème de nuit' });
  await expect(day.getByRole('radio')).toHaveCount(5);
  await expect(night.getByRole('radio')).toHaveCount(3);
  await card(day, 'Kraft').click();
  await expect(card(day, 'Kraft')).toHaveAttribute('aria-checked', 'true');
  await expect(day.locator('[aria-checked="true"]')).toHaveCount(1);
  expect(await css(ui.page, 'body', 'background-color')).toBe('rgb(239, 228, 208)');
  expect(await css(ui.page, 'body', 'color')).toBe('rgb(59, 42, 26)');
  expect(await css(ui.page, '.rail', 'background-color')).not.toBe('rgb(235, 235, 228)');
});

recette('25.11', async ({ app, ui }) => {
  await app.start({
    vault: baseVault(),
    preferences: { theme: 'day', language: 'auto' },
    viewport: { width: 1440, height: 900 },
  });
  const settings = await ui.settings();
  const preview = settings.locator('.preview-app');
  await expect(preview).toBeVisible();
  await card(settings, 'Minuit').hover();
  await expect.poll(() => preview.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(11, 11, 14)');
  expect(await css(ui.page, 'body', 'background-color')).toBe('rgb(244, 244, 240)');
  await ui.page.mouse.move(5, 5);
  await expect.poll(() => preview.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(244, 244, 240)');
});

recette('25.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  const settings = await ui.settings();
  await card(settings, 'Minuit').click();
  await expect(ui.page.locator('html')).toHaveAttribute('data-paper', 'night');
  expect(await css(ui.page, 'body', 'background-color')).toBe('rgb(11, 11, 14)');
  await expect(settings.getByRole('radio', { name: 'Papier de nuit', exact: true })).toHaveAttribute('aria-checked', 'true');
});

recette('25.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  const settings = await ui.settings();
  await settings.locator('.color-role', { hasText: 'Accent (actions)' }).locator('input[type="color"]').fill('#0078bf');
  await expect.poll(() => token(ui.page, '--accent')).toBe('#0078bf');
  // The search field's focus ring takes it.
  await settings.getByRole('searchbox', { name: 'Chercher un réglage' }).focus();
  expect(await css(ui.page, '.settings-search', 'outline-color')).toBe('rgb(0, 120, 191)');
  await settings.getByRole('button', { name: 'Revenir aux couleurs du thème' }).click();
  await expect.poll(() => token(ui.page, '--accent')).toBe('#ff48b0');
  await expect(settings.getByRole('button', { name: 'Revenir aux couleurs du thème' })).toHaveCount(0);
});

recette('25.14', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  const settings = await ui.settings();
  await expect(settings.locator('.contrast-note.is-ok')).toBeVisible();
  await settings
    .locator('.color-role', { hasText: /^Texte#/ })
    .locator('input[type="color"]')
    .fill('#e8e8e2');
  const warning = settings.locator('.contrast-note.is-low');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('le texte sur le fond');
});

recette('25.15', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Lecture.md': '# Lecture\n\nDu texte à lire.\n' }) });
  await ui.open('Lecture');
  const settings = await ui.settings();
  await settings.locator('#set-note-font').selectOption('literata');
  await ui.tab('Lecture').click();
  const font = (locator: Locator) => locator.first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(await font(ui.editor)).toContain('Literata');
  expect(await font(ui.title)).toContain('Archivo');
  await ui.mode('Lire');
  expect(await font(ui.reading)).toContain('Literata');
  // The theme's own font: Papier prints its notes in Literata, Atelier in the interface's font.
  await ui.tab('Réglages').click();
  await settings.locator('#set-note-font').selectOption('theme');
  const day = settings.getByRole('radiogroup', { name: 'Thème de jour' });
  await card(day, 'Papier').click();
  await ui.tab('Lecture').click();
  expect(await font(ui.reading)).toContain('Literata');
  await ui.tab('Réglages').click();
  await card(day, 'Atelier').click();
  await ui.tab('Lecture').click();
  expect(await font(ui.reading)).toContain('Archivo');
});

recette('25.16', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Code.md': 'Du `code` ici.\n' }) });
  await ui.open('Code');
  const settings = await ui.settings();
  await settings.locator('#set-ui-font').selectOption('atkinson');
  expect(await css(ui.page, 'body', 'font-family')).toContain('Atkinson Hyperlegible');
  await settings.locator('#set-code-font').selectOption('system');
  await ui.tab('Code').click();
  await ui.mode('Lire');
  const code = await ui.reading
    .locator('code')
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(code).toContain('ui-monospace');
  expect(code).not.toContain('Commit Mono');
});

recette('25.17', async ({ app, ui }) => {
  const files = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`Liste/Note ${String(i).padStart(2, '0')}.md`, 'x']));
  await app.start({ vault: baseVault(files) });
  await ui.row('Liste').click();
  const settings = await ui.settings();
  const tops = () =>
    ui.page
      .locator('.tree-row')
      .evaluateAll((rows) => rows.slice(0, 4).map((r) => [r.getBoundingClientRect().height, r.getBoundingClientRect().top]));
  for (const [label, height] of [
    ['Compacte', 24],
    ['Aérée', 34],
  ] as const) {
    await settings.getByRole('radio', { name: label, exact: true }).click();
    const rows = await tops();
    expect(
      rows.every(([h]) => Math.round(h!) === height),
      label,
    ).toBe(true);
    expect(Math.round(rows[1]![1]! - rows[0]![1]!), label).toBe(height);
    expect(
      Math.round(
        await ui.tags
          .locator('.tag-row')
          .first()
          .evaluate((el) => el.getBoundingClientRect().height),
      ),
    ).toBe(height);
  }
  // The last note of the long folder can still be reached.
  await ui.page.locator('.tree').evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await expect(ui.row('Liste/Note 59.md')).toBeInViewport();
});

recette('25.18', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  const radius = () => css(ui.page, '.settings-search', 'border-radius');
  await settings.getByRole('radio', { name: 'Droits', exact: true }).click();
  expect(await radius()).toBe('0px');
  await settings.getByRole('radio', { name: 'Ronds', exact: true }).click();
  expect(await radius()).toBe('8px');
  expect(await css(ui.page, '.theme-swatch', 'border-radius')).toBe('11px');
});

recette('25.19', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  let settings = await ui.settings();
  await card(settings, 'Kraft').click();
  await settings.locator('.color-role', { hasText: 'Surlignage' }).locator('input[type="color"]').fill('#ffcc00');
  await settings.locator('#set-note-font').selectOption('atkinson');
  await settings.getByRole('radio', { name: 'Aérée', exact: true }).click();
  await settings.getByRole('radio', { name: 'Ronds', exact: true }).click();
  await ui.page.waitForTimeout(600);
  await app.restart();
  await expect.poll(() => css(ui.page, 'body', 'background-color')).toBe('rgb(239, 228, 208)');
  expect(await token(ui.page, '--mark')).toBe('#ffcc00');
  expect(await token(ui.page, '--font-note')).toContain('Atkinson');
  expect(await token(ui.page, '--row')).toBe('34px');
  expect(await token(ui.page, '--radius')).toBe('8px');
  settings = await ui.settings();
  await expect(card(settings, 'Kraft')).toHaveAttribute('aria-checked', 'true');
});

recette('25.20', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), viewport: { width: 700, height: 800 } });
  const settings = await ui.settings();
  const nav = settings.getByRole('navigation', { name: 'Sections des réglages' });
  const page = settings.locator('.settings-page');
  const navBox = (await nav.boundingBox())!;
  const pageBox = (await page.boundingBox())!;
  expect(navBox.y + navBox.height).toBeLessThanOrEqual(pageBox.y + 1);
  await expect(settings.locator('.settings-preview')).toBeHidden();
  expect(await ui.overflowsSideways()).toBe(false);
  expect(await settings.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

recette('25.21', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  const settings = await ui.settings();
  const day = settings.getByRole('radiogroup', { name: 'Thème de jour' });
  await settings.getByRole('button', { name: 'Nouveau thème à partir de Atelier' }).click();
  await expect(day.getByRole('radio')).toHaveCount(6);
  await expect(card(day, 'Atelier \\(copie\\)')).toHaveAttribute('aria-checked', 'true');
  const name = settings.getByLabel('Nom du thème');
  await expect(name).toHaveValue('Atelier (copie)');
  await name.fill('Mon atelier');
  await expect(card(day, 'Mon atelier')).toBeVisible();
  await expect(settings.locator('.setting-block .label', { hasText: 'Couleurs de Mon atelier' })).toBeVisible();
  await settings.locator('.color-role', { hasText: 'Fond' }).locator('input[type="color"]').fill('#fafaf5');
  await expect.poll(() => css(ui.page, 'body', 'background-color')).toBe('rgb(250, 250, 245)');
  // Its colours are its own: nothing to go back to.
  await expect(settings.getByRole('button', { name: 'Revenir aux couleurs du thème' })).toHaveCount(0);
});

recette('25.22', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  const settings = await ui.settings();
  const day = settings.getByRole('radiogroup', { name: 'Thème de jour' });
  await card(day, 'Kraft').click();
  // What the page offers to save.
  await ui.page.evaluate(() => {
    const w = window as unknown as { __saved: { name: string; text?: string }[] };
    w.__saved = [];
    const blobs = new Map<string, Blob>();
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      const url = `blob:saved-${blobs.size}`;
      blobs.set(url, blob as Blob);
      return url;
    };
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      const entry = { name: this.download } as { name: string; text?: string };
      w.__saved.push(entry);
      void blobs
        .get(this.href)
        ?.text()
        .then((text) => (entry.text = text));
    };
  });
  await settings.getByRole('button', { name: 'Exporter' }).click();
  const saved = await expect
    .poll(() => ui.page.evaluate(() => (window as unknown as { __saved: { name: string; text?: string }[] }).__saved))
    .toEqual([expect.objectContaining({ name: 'Kraft.cobblestone-theme.json', text: expect.any(String) })])
    .then(() => ui.page.evaluate(() => (window as unknown as { __saved: { text: string }[] }).__saved[0]!.text));
  const file = JSON.parse(saved) as { name: string; scheme: string; colors: Record<string, string>; noteFont: string };
  expect(file).toMatchObject({ name: 'Kraft', scheme: 'light', noteFont: 'literata' });
  expect(file.colors.paper).toBe('#efe4d0');
  // On another device: the same file, renamed and repainted.
  file.name = 'Importé';
  file.colors.paper = '#fafafa';
  const input = settings.locator('input[type="file"]');
  await input.setInputFiles({ name: 'theme.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await expect(card(day, 'Importé')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => css(ui.page, 'body', 'background-color')).toBe('rgb(250, 250, 250)');
  await expect(ui.toasts.last()).toContainText('Thème « Importé » importé.');
  await input.setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"notes": []}') });
  await expect(ui.toasts.last()).toContainText('Ce fichier n’est pas un thème Cobblestone.');
  await expect(day.getByRole('radio')).toHaveCount(6);
});

recette('25.23', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'day', language: 'auto' } });
  const settings = await ui.settings();
  const day = settings.getByRole('radiogroup', { name: 'Thème de jour' });
  await card(day, 'Forêt').click();
  await settings.getByRole('button', { name: 'Nouveau thème à partir de Forêt' }).click();
  await expect(day.getByRole('radio')).toHaveCount(6);
  await settings.getByRole('button', { name: 'Supprimer ce thème' }).click();
  await expect(day.getByRole('radio')).toHaveCount(5);
  await expect(card(day, 'Atelier')).toHaveAttribute('aria-checked', 'true');
  expect(await css(ui.page, 'body', 'background-color')).toBe('rgb(244, 244, 240)');
});

recette('25.24', async ({ app, ui }) => {
  const red = 'body { background-color: rgb(1, 2, 3) !important; }';
  await app.start({ vault: baseVault({ '.cobblestone/snippets/fond.css': red }) });
  const settings = await ui.settings();
  const snippet = settings.getByRole('switch', { name: 'fond' });
  await expect(snippet).toHaveAttribute('aria-checked', 'false');
  await snippet.click();
  await expect.poll(() => css(ui.page, 'body', 'background-color')).toBe('rgb(1, 2, 3)');
  // Changed in another editor: Reload takes the new version.
  await app.write('.cobblestone/snippets/fond.css', red.replace('1, 2, 3', '4, 5, 6'));
  await settings.getByRole('button', { name: 'Recharger' }).click();
  await expect.poll(() => css(ui.page, 'body', 'background-color')).toBe('rgb(4, 5, 6)');
  await ui.page.waitForTimeout(600);
  await app.restart();
  await expect.poll(() => css(ui.page, 'body', 'background-color')).toBe('rgb(4, 5, 6)');
});

recette('25.25', async ({ app, ui }) => {
  const appearance = JSON.stringify({ baseFontSize: 18, enabledCssSnippets: ['Vert'] });
  await app.start({
    vault: obsidianVault({
      '.obsidian/appearance.json': appearance,
      '.obsidian/snippets/Vert.css': 'body { color: rgb(0, 128, 0) !important; }',
    }),
  });
  await expect.poll(() => css(ui.page, 'body', 'color')).toBe('rgb(0, 128, 0)');
  const settings = await ui.settings();
  const row = settings.locator('.snippet-row', { hasText: 'Vert' });
  await expect(row.locator('.badge')).toHaveText('Obsidian');
  await expect(row.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await ui.page.waitForTimeout(600);
  expect(await app.read('.obsidian/appearance.json')).toBe(appearance);
});

recette(
  '25.26',
  async ({ app, ui }) => {
    await app.start({ vault: baseVault() });
    await app.electron.evaluate(({ shell }) => {
      const calls: string[] = [];
      (globalThis as { __reveals?: string[] }).__reveals = calls;
      shell.showItemInFolder = (path: string) => void calls.push(path);
      shell.openPath = async (path: string) => {
        calls.push(path);
        return '';
      };
    });
    const settings = await ui.settings();
    await settings.getByRole('button', { name: 'Ouvrir le dossier' }).click();
    await expect
      .poll(() => app.electron.evaluate(() => (globalThis as { __reveals?: string[] }).__reveals ?? []))
      .toEqual([`${app.root}/.cobblestone/snippets`]);
    expect(await app.exists('.cobblestone/snippets')).toBe(true);
  },
  { seulement: ['bureau'] },
);
