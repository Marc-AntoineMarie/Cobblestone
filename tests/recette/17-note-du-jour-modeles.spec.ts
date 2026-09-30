import { expect, recette } from './lib/recette';
import { baseVault, obsidianVault } from './lib/vaults';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 17. Note du jour et modèles.

const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
const isoToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

async function templateInto(app: Cobble, ui: Ui, text: string, template: string, extra = {}) {
  await app.start({ vault: baseVault({ 'Essai.md': text, 'Modèles/Test.md': template, ...extra }) });
  await ui.open('Essai');
}
async function insertTemplate(ui: Ui, name = 'Test') {
  await ui.page.keyboard.press('Alt+t');
  await ui.palette.locator('input').fill(name);
  await ui.palette.locator('.finder-item', { hasText: name }).first().waitFor();
  await ui.page.keyboard.press('Enter');
}

recette('17.1', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-daily-folder').selectOption('Journal');
  await ui.page.keyboard.press('Control+Shift+D');
  await expect(ui.activeTab).toContainText(isoToday);
  await expect.poll(() => app.exists(`Journal/${isoToday}.md`)).toBe(true);
});

recette('17.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.page.keyboard.press('Control+Shift+D');
  await expect(ui.activeTab).toContainText(isoToday);
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+Shift+D');
  await expect(ui.activeTab).toContainText(isoToday);
  expect((await app.list()).filter((p) => p.includes(isoToday))).toEqual([`${isoToday}.md`]);
});

recette('17.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const settings = await ui.settings();
  await settings.locator('#set-daily-format').fill('dddd D MMMM YYYY');
  await settings.locator('#set-daily-format').press('Tab');
  await ui.page.keyboard.press('Control+Shift+D');
  const expected = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  await expect(ui.activeTab).toContainText(expected);
  await expect.poll(() => app.exists(`${expected}.md`)).toBe(true);
});

recette('17.4', async ({ app, ui }) => {
  await app.start({ vault: obsidianVault() });
  await ui.page.keyboard.press('Control+Shift+D');
  const name = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
  await expect.poll(() => app.readOr(`Journal/${name}.md`)).toMatch(new RegExp(`^# ${name}\\n\\n${isoToday} \\d{2}:\\d{2}\\n$`));
});

recette('17.5', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Essai.md': '' }) });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.press('Alt+t');
  await expect(ui.palette.locator('.finder-item', { hasText: 'Quotidien' })).toBeVisible();
  await ui.page.keyboard.press('Escape');
  await app.restart();
  await expect(ui.vaultName).toBeVisible();
});

recette('17.6', async ({ app, ui }) => {
  await templateInto(app, ui, 'avant\n', '# {{title}}\n{{date}} {{time}}');
  await ui.editEnd();
  await insertTemplate(ui);
  await expect.poll(() => app.read('Essai.md')).toMatch(new RegExp(`^avant\\n# Essai\\n${isoToday} \\d{2}:\\d{2}$`));
});

recette('17.7', async ({ app, ui }) => {
  await templateInto(app, ui, 'garder REMPLACER garder', 'nouveau');
  await ui.gotoLine(0);
  await ui.page.keyboard.press('Home');
  for (let i = 0; i < 7; i++) await ui.page.keyboard.press('ArrowRight');
  for (let i = 0; i < 9; i++) await ui.page.keyboard.press('Shift+ArrowRight');
  await insertTemplate(ui);
  await expect.poll(() => app.read('Essai.md')).toBe('garder nouveau garder');
});

recette('17.8', async ({ app, ui }) => {
  await templateInto(app, ui, '', '{{date:DD/MM/YYYY}} {{time:HH[h]mm}} {{TITLE}}');
  await ui.editor.click();
  await insertTemplate(ui);
  await expect
    .poll(() => app.read('Essai.md'))
    .toMatch(new RegExp(`^${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} \\d{2}h\\d{2} Essai$`));
});

recette('17.9', async ({ app, ui }) => {
  await templateInto(app, ui, 'contenu existant', 'ajouté à la fin');
  await ui.mode('Lire');
  await insertTemplate(ui);
  await expect.poll(() => app.read('Essai.md')).toMatch(/^contenu existant\n+ajouté à la fin\n?$/);
});

recette('17.10', async ({ app, ui }) => {
  const vault = Object.fromEntries(Object.entries(baseVault({ 'Essai.md': '' })).filter(([p]) => !p.startsWith('Modèles/')));
  await app.start({ vault });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.press('Alt+t');
  await expect(ui.toasts.filter({ hasText: 'Aucun dossier de modèles' })).toHaveClass(/is-error/);
});

recette('17.11', async ({ app, ui }) => {
  const vault = Object.fromEntries(
    Object.entries(baseVault({ 'Essai.md': '', 'Modèles/image.png': new Uint8Array([1]) })).filter(
      ([p]) => p !== 'Modèles/Quotidien.md',
    ),
  );
  await app.start({ vault });
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.press('Alt+t');
  await expect(ui.toasts.filter({ hasText: 'ne contient aucune note' })).toHaveClass(/is-error/);
});

recette('17.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Essai.md': '', 'Gabarits/Réunion type.md': 'ordre du jour' }) });
  const settings = await ui.settings();
  await settings.locator('#set-templates').selectOption('Gabarits');
  await ui.open('Essai');
  await ui.editor.click();
  await ui.page.keyboard.press('Alt+t');
  await expect(ui.palette.locator('.finder-item', { hasText: 'Réunion type' })).toBeVisible();
  await expect(ui.palette.locator('.finder-item', { hasText: 'Quotidien' })).toHaveCount(0);
});

recette('17.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Essai.md': '', 'Modèles/Test.md': '{{date}}|{{time}}' }) });
  const settings = await ui.settings();
  await settings.locator('#set-tpl-date').fill('DD.MM.YY');
  await settings.locator('#set-tpl-time').fill('HH[h]');
  await settings.locator('#set-tpl-time').press('Tab');
  await ui.open('Essai');
  await ui.editor.click();
  await insertTemplate(ui);
  await expect
    .poll(() => app.read('Essai.md'))
    .toMatch(
      new RegExp(`^${pad(now.getDate())}\\.${pad(now.getMonth() + 1)}\\.${String(now.getFullYear()).slice(2)}\\|\\d{2}h$`),
    );
});

recette('17.14', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Modèles/Test.md': '# {{title}}' }) });
  await ui.page.keyboard.press(app.key('newNote'));
  await ui.page.keyboard.type('Réunion lundi');
  await ui.page.keyboard.press('Enter');
  await insertTemplate(ui);
  await expect.poll(() => app.readOr('Réunion lundi.md')).toBe('# Réunion lundi');
});
