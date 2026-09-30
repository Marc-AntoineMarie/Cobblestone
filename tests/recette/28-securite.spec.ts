import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 28. Sécurité : une note piégée n'exécute rien.

/** Opens a trapped note in writing then reading, and returns what it managed to run. */
async function trap(app: Cobble, ui: Ui, text: string, extra = {}) {
  await app.start({ vault: baseVault({ 'Piège.md': text + '\n\nfin', ...extra }) });
  const dialogs: string[] = [];
  ui.page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await ui.open('Piège');
  await ui.editEnd();
  await ui.page.waitForTimeout(400);
  await ui.mode('Lire');
  await ui.page.waitForTimeout(400);
  const pwned = await ui.page.evaluate(() => (window as { __pwned?: unknown }).__pwned);
  return { dialogs, pwned };
}

recette('28.1', async ({ app, ui }) => {
  const run = await trap(app, ui, '<script>window.__pwned = 1; alert(1)</script>');
  expect(run).toEqual({ dialogs: [], pwned: undefined });
  await expect(ui.reading.locator('script')).toHaveCount(0);
});

recette('28.2', async ({ app, ui }) => {
  const run = await trap(app, ui, '<img src=x onerror="window.__pwned = 1; alert(1)">');
  expect(run).toEqual({ dialogs: [], pwned: undefined });
  expect(await ui.reading.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('onerror')))).toEqual(
    expect.not.arrayContaining([expect.any(String)]),
  );
});

recette('28.3', async ({ app, ui }) => {
  const run = await trap(app, ui, '[clic](javascript:window.__pwned=1;alert(1))');
  const link = ui.reading.locator('a', { hasText: 'clic' });
  if (await link.count()) await link.click();
  await ui.page.waitForTimeout(300);
  expect(run.dialogs).toEqual([]);
  expect(await ui.page.evaluate(() => (window as { __pwned?: unknown }).__pwned)).toBeUndefined();
});

recette('28.4', async ({ app, ui }) => {
  await trap(app, ui, '<iframe src="https://example.org"></iframe>');
  await expect(ui.reading.locator('iframe')).toHaveCount(0);
  await ui.mode('Écrire');
  await expect(ui.editor.locator('iframe')).toHaveCount(0);
});

recette('28.5', async ({ app, ui }) => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="window.parent.__pwned=1"><script>window.parent.__pwned=1;alert(1)</script><rect width="10" height="10"/></svg>';
  const run = await trap(app, ui, '![[piège.svg]]', { 'piège.svg': svg });
  expect(run).toEqual({ dialogs: [], pwned: undefined });
  await expect(ui.reading.locator('.internal-embed img')).toBeVisible();
});

recette('28.6', async ({ app, ui }) => {
  const diagram = '```mermaid\ngraph TD\n  A["<img src=x onerror=alert(1)>"] --> B\n  click A "javascript:alert(1)"\n```';
  const run = await trap(app, ui, diagram);
  await expect(ui.reading.locator('.mermaid-diagram svg, .mermaid-diagram.is-error')).toBeVisible({ timeout: 15_000 });
  expect(run.dialogs).toEqual([]);
  const hrefs = await ui.reading
    .locator('.mermaid-diagram [href], .mermaid-diagram [xlink\\:href]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? e.getAttribute('xlink:href') ?? ''));
  expect(hrefs.filter((h) => /^\s*javascript:/i.test(h))).toEqual([]);
  await expect(ui.reading.locator('.mermaid-diagram img[onerror]')).toHaveCount(0);
});

recette('28.7', async ({ app, ui }) => {
  await trap(app, ui, '[x](../../etc/passwd)');
  await ui.reading.locator('a', { hasText: 'x' }).click();
  await ui.page.waitForTimeout(500);
  const shown = await ui.view.innerText();
  expect(shown).not.toMatch(/root:.*:0:0/);
  if (app.desktop) {
    const { existsSync } = await import('node:fs');
    const path = await import('node:path');
    expect(existsSync(path.join(app.root, '..', '..', 'etc', 'passwd.md'))).toBe(false);
  }
});
