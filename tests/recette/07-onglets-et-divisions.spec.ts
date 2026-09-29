import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Ui } from './lib/ui';

// 7. Onglets et divisions.

const back = (ui: Ui) => ui.noteBar.getByRole('button', { name: 'Précédent' });
const forward = (ui: Ui) => ui.noteBar.getByRole('button', { name: 'Suivant' });
const tabTitles = (ui: Ui) => ui.tabs.locator('.tab-title').allTextContents();

recette('7.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').click();
  await ui.row('Étude.md').click();
  await expect(ui.tabs).toHaveCount(1);
  await expect(ui.activeTab).toContainText('Étude');
  await back(ui).click();
  await expect(ui.activeTab).toContainText('Idées');
});

recette('7.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.pane.locator('.tab-new').click();
  const actions = ui.pane.locator('.empty-actions:visible button');
  await expect(actions).toHaveText([/Créer une note/, /Chercher une note/, /Ouvrir la note du jour/]);
  await expect(actions.locator('kbd')).toHaveCount(3);
});

recette('7.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const action = (name: RegExp) => ui.pane.locator('.empty-actions:visible button', { hasText: name });
  await ui.pane.locator('.tab-new').click();
  await action(/Créer une note/).click();
  await expect(ui.activeTab).toContainText('Sans titre');
  await ui.pane.locator('.tab-new').click();
  await action(/Chercher une note/).click();
  await expect(ui.palette).toBeVisible();
  await ui.page.keyboard.press('Escape');
  await ui.pane.locator('.tab-new').click();
  await action(/Ouvrir la note du jour/).click();
  await expect(ui.activeTab).toContainText(new Date().toLocaleDateString('sv-SE'));
});

recette('7.4', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await ui.tab('Idées').click();
  await expect(ui.tab('Idées')).toHaveClass(/is-active/);
  await expect(ui.tab('Idées')).toHaveAttribute('aria-selected', 'true');
  const line = await ui.tab('Idées').evaluate((el) => {
    const style = getComputedStyle(el);
    const before = getComputedStyle(el, '::before');
    return [style.borderTopColor, style.boxShadow, before.backgroundColor].join(' ');
  });
  expect(line).toMatch(/rgb\(30, 42, 79\)/);
});

recette('7.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await ui.tab('Étude').getByRole('button', { name: 'Fermer' }).click();
  await expect(ui.tabs).toHaveCount(1);
  await expect(ui.activeTab).toContainText('Idées');
});

recette('7.6', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await ui.tab('Étude').click({ button: 'middle' });
  await expect(ui.tabs).toHaveCount(1);
});

recette('7.7', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await ui.page.keyboard.press('Control+w');
  await expect(ui.tabs).toHaveCount(1);
  await expect(ui.activeTab).toContainText('Idées');
});

recette('7.8', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await ui.page.keyboard.press('Alt+w');
  await expect(ui.tabs).toHaveCount(1);
});

recette('7.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.keyboard.press(app.key('closeTab'));
  await expect(ui.tabs).toHaveCount(1);
  await expect(ui.activeTab).toContainText('Rien d’ouvert');
});

recette('7.10', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.activeTab.click({ button: 'right' });
  await expect(ui.menu.getByRole('menuitem')).toHaveText(['Épingler', 'Fermer']);
});

recette('7.11', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.activeTab.click({ button: 'right' });
  await ui.menuItem('Épingler').click();
  await expect(ui.tab('Idées').locator('.tab-pin')).toBeVisible();
  await expect(ui.tab('Idées').locator('.tab-close')).toHaveCount(0);
  await ui.row('Étude.md').click();
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.tab('Idées')).toBeVisible();
});

recette('7.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.activeTab.click({ button: 'right' });
  await ui.menuItem('Épingler').click();
  await ui.activeTab.click({ button: 'right' });
  await ui.menuItem('Désépingler').click();
  await expect(ui.tab('Idées').locator('.tab-close')).toBeVisible();
  await expect(ui.tab('Idées').locator('.tab-pin')).toHaveCount(0);
});

recette('7.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await ui.openInNewTab('Réunion');
  await ui.tab('Réunion').hover();
  await ui.page.mouse.down();
  const box = (await ui.tab('Idées').boundingBox())!;
  await ui.page.mouse.move(box.x + 6, box.y + box.height / 2, { steps: 6 });
  await ui.page.mouse.move(box.x + 5, box.y + box.height / 2);
  await expect(ui.tab('Idées')).toHaveClass(/is-drop-before/);
  await ui.page.mouse.up();
  expect(await tabTitles(ui)).toEqual(['Réunion', 'Idées', 'Étude']);
});

recette('7.14', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await ui.row('Idées.md').click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.activeTab).toContainText('Idées');
});

recette('7.15', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+\\');
  await expect(ui.panes).toHaveCount(2);
  await expect(ui.page.locator('.split.is-row')).toBeVisible();
  await expect(ui.panes.nth(1).locator('.tab.is-active')).toContainText('Idées');
});

recette('7.16', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.noteBar.getByRole('button', { name: 'Plus' }).click();
  await ui.menuItem('Diviser en bas').click();
  await expect(ui.panes).toHaveCount(2);
  await expect(ui.page.locator('.split.is-column')).toBeVisible();
});

recette('7.17', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+\\');
  const handle = ui.page.locator('.split-handle').first();
  await handle.hover();
  const color = await handle.evaluate((el) => {
    const s = getComputedStyle(el);
    const a = getComputedStyle(el, '::after');
    return [s.backgroundColor, a.backgroundColor, s.borderColor].join(' ');
  });
  expect(color).toMatch(/255, 72, 176|srgb 1 0\.28/);
  const before = (await ui.panes.first().boundingBox())!.width;
  const box = (await handle.boundingBox())!;
  await ui.page.mouse.down();
  await ui.page.mouse.move(box.x - 150, box.y + box.height / 2, { steps: 5 });
  await ui.page.mouse.up();
  expect((await ui.panes.first().boundingBox())!.width).toBeLessThan(before - 100);
});

recette('7.18', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+\\');
  const [left, right] = [ui.panes.nth(0), ui.panes.nth(1)];
  await left.locator('.cm-content').click();
  await expect(left).toHaveClass(/is-active/);
  await expect(right).not.toHaveClass(/is-active/);
  await right.locator('.cm-content').click();
  await expect(right).toHaveClass(/is-active/);
  const [active, inactive] = await Promise.all(
    [right, left].map((pane) => pane.locator('.tab.is-active').evaluate((el) => getComputedStyle(el).boxShadow)),
  );
  expect(active).toContain('rgb(30, 42, 79)');
  expect(inactive).not.toContain('rgb(30, 42, 79)');
});

recette('7.19', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+\\');
  await ui.panes.nth(1).locator('.tab.is-active').getByRole('button', { name: 'Fermer' }).click();
  await expect(ui.panes).toHaveCount(1);
});

recette('7.20', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+\\');
  await ui.noteBar.getByRole('button', { name: 'Plus' }).click();
  await ui.menuItem('Diviser en bas').click();
  await expect(ui.panes).toHaveCount(3);
  await expect(ui.page.locator('.split.is-row .split.is-column')).toBeVisible();
});

recette('7.21', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+\\');
  await ui.panes.nth(1).locator('.cm-content').click();
  await ui.page.keyboard.press('Control+End');
  await ui.page.keyboard.type('\nÉcrit à droite');
  await expect(ui.panes.nth(0).locator('.cm-content')).toContainText('Écrit à droite');
});

recette('7.22', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').click();
  await expect(back(ui)).toBeDisabled();
  await expect(forward(ui)).toBeDisabled();
  await ui.row('Étude.md').click();
  await back(ui).click();
  await expect(ui.activeTab).toContainText('Idées');
  await forward(ui).click();
  await expect(ui.activeTab).toContainText('Étude');
  await expect(forward(ui)).toBeDisabled();
});

recette('7.23', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').click();
  await ui.row('Étude.md').click();
  await ui.editor.click();
  await ui.page.keyboard.press('Control+Alt+ArrowLeft');
  await expect(ui.activeTab).toContainText('Idées');
  await ui.editor.click();
  await ui.page.keyboard.press('Control+Alt+ArrowRight');
  await expect(ui.activeTab).toContainText('Étude');
});

recette('7.24', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Idées.md').click();
  await ui.row('Étude.md').click();
  await ui.row('Étude.md').focus();
  await ui.page.keyboard.press('Alt+ArrowLeft');
  await expect(ui.activeTab).toContainText('Idées');
  await ui.page.keyboard.press('Alt+ArrowRight');
  await expect(ui.activeTab).toContainText('Étude');
  // In the editor, Alt+arrows stay with the text.
  await ui.editor.click();
  await ui.page.keyboard.press('Alt+ArrowLeft');
  await expect(ui.activeTab).toContainText('Étude');
});

recette('7.25', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await ui.page.keyboard.press('Control+\\');
  const handle = ui.page.locator('.split-handle').first();
  const box = (await handle.boundingBox())!;
  await handle.hover();
  await ui.page.mouse.down();
  await ui.page.mouse.move(box.x - 120, box.y + box.height / 2, { steps: 5 });
  await ui.page.mouse.up();
  const width = (await ui.panes.first().boundingBox())!.width;
  await ui.page.waitForTimeout(700);
  await app.restart();
  await expect(ui.panes).toHaveCount(2);
  await expect(ui.panes.first().locator('.tab')).toHaveCount(2);
  expect(Math.abs((await ui.panes.first().boundingBox())!.width - width)).toBeLessThan(8);
});

recette('7.26', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.openInNewTab('Étude');
  await ui.contextMenu('Idées.md', 'Mettre à la corbeille');
  await expect(ui.tabs).toHaveCount(1);
  await expect(ui.activeTab).toContainText('Étude');
});

recette('7.27', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.editor.click();
  await ui.page.keyboard.press('Control+Home');
  await ui.page.keyboard.press('End');
  await ui.pane.locator('.cm-editor').evaluate((el) => el.setAttribute('data-recette', 'même éditeur'));
  await ui.contextMenu('Idées.md', 'Renommer');
  await ui.page.locator('.tree-rename').fill('Pistes');
  await ui.page.locator('.tree-rename').press('Enter');
  await expect(ui.activeTab).toContainText('Pistes');
  await expect(ui.pane.locator('.cm-editor')).toHaveAttribute('data-recette', 'même éditeur');
  await ui.editor.click({ position: { x: 1, y: 1 } }).catch(() => undefined);
});

recette('7.28', async ({ app, ui }) => {
  const many = Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => [`Une note au titre particulièrement long numéro ${i}.md`, `note ${i}`]),
  );
  await app.start({ vault: baseVault(many) });
  for (let i = 0; i < 20; i++) await ui.openInNewTab(`Une note au titre particulièrement long numéro ${i}`);
  const bar = ui.pane.locator('.tabs');
  expect(await bar.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  const title = ui.activeTab.locator('.tab-title');
  expect(await title.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
  expect(await title.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
});
