import { expect, recette } from './lib/recette';

// 32. Téléphone.

recette('32.1', async ({ app, ui }) => {
  await app.start({ vault: 'demo', iphone: true });
  const page = ui.page;
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /maximum-scale=1/);
  const unzoomed = async (field: import('@playwright/test').Locator) => {
    await field.first().tap();
    const size = await field.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  };
  await unzoomed(page.locator('.note-title'));
  await unzoomed(page.locator('.cm-content'));
  await page.locator('.mobile-nav-btn[data-tab=search]').tap();
  await unzoomed(page.locator('.mobile-panel-screen input'));
});
