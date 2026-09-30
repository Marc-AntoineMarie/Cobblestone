import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';

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
