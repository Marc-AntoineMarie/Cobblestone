import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 13. Aperçu au survol.

const LONG = Array.from({ length: 40 }, (_, i) => `Ligne ${i} de la note cible.`).join('\n\n');

async function reading(app: Cobble, ui: Ui, text: string) {
  await app.start({
    vault: baseVault({
      'Essai.md': text,
      'Cible.md': `# Cible\n\nDébut de la cible.\n\n${LONG}\n\n## Section\n\nTexte de section ^b1\n`,
    }),
  });
  await ui.open('Essai');
  await ui.mode('Lire');
}

const linkTo = (ui: Ui, text: string) => ui.reading.locator('a.internal-link', { hasText: text }).first();

recette('13.1', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[Cible]].');
  await linkTo(ui, 'Cible').hover();
  await ui.page.waitForTimeout(600);
  await expect(ui.preview).toBeVisible();
  await expect(ui.preview.locator('.hover-preview-body')).toContainText('Début de la cible.');
});

recette('13.2', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[Cible]].');
  await linkTo(ui, 'Cible').hover();
  await ui.page.waitForTimeout(120);
  await ui.page.mouse.move(5, 400);
  await ui.page.waitForTimeout(700);
  await expect(ui.preview).toHaveCount(0);
});

recette('13.3', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[Cible]].');
  await linkTo(ui, 'Cible').hover();
  await expect(ui.preview).toBeVisible();
  const box = (await ui.preview.boundingBox())!;
  await ui.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await ui.page.waitForTimeout(600);
  await expect(ui.preview).toBeVisible();
  const body = ui.preview.locator('.hover-preview-body');
  await body.evaluate((el) => (el.scrollTop = 200));
  expect(await body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

recette('13.4', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[Cible]].');
  await linkTo(ui, 'Cible').hover();
  await expect(ui.preview).toBeVisible();
  const box = (await ui.preview.boundingBox())!;
  await ui.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await ui.page.mouse.move(5, 5, { steps: 4 });
  await expect(ui.preview).toHaveCount(0, { timeout: 2000 });
});

recette('13.5', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[Cible#Section]] et [[Cible#^b1]].');
  await linkTo(ui, 'Section').hover();
  await expect(ui.preview.locator('.hover-preview-body')).toContainText('Texte de section');
  await expect(ui.preview.locator('.hover-preview-body')).not.toContainText('Début de la cible.');
  await ui.page.mouse.move(5, 5);
  await expect(ui.preview).toHaveCount(0, { timeout: 2000 });
  await ui.reading.locator('a.internal-link').nth(1).hover();
  await expect(ui.preview.locator('.hover-preview-body')).toContainText('Texte de section');
  await expect(ui.preview.locator('.hover-preview-body')).not.toContainText('Ligne 3');
});

recette('13.6', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[image.png]].');
  await linkTo(ui, 'image.png').hover();
  await expect(ui.preview.locator('img')).toBeVisible();
});

recette('13.7', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[Fantôme]].');
  await linkTo(ui, 'Fantôme').hover();
  await expect(ui.preview).toContainText('« Fantôme » n’existe pas encore');
});

recette('13.8', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[Cible]].');
  await linkTo(ui, 'Cible').hover();
  const open = ui.preview.getByRole('button', { name: 'Ouvrir la note' });
  await open.click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.preview).toHaveCount(0);
  await ui.tab('Essai').click();
  await linkTo(ui, 'Cible').hover();
  await ui.preview.getByRole('button', { name: 'Ouvrir la note' }).click();
  await expect(ui.activeTab).toContainText('Cible');
  await expect(ui.preview).toHaveCount(0);
});

recette('13.9', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Essai.md': 'Voir [[Relais]].', 'Relais.md': 'Vers [[Idées]] ensuite.' }) });
  await ui.open('Essai');
  await ui.mode('Lire');
  await linkTo(ui, 'Relais').hover();
  await ui.preview.locator('a.internal-link', { hasText: 'Idées' }).click();
  await expect(ui.activeTab).toContainText('Idées');
});

recette('13.10', async ({ app, ui }) => {
  await reading(app, ui, 'Voir [[Cible]].');
  await linkTo(ui, 'Cible').hover();
  await expect(ui.preview).toBeVisible();
  await ui.page.keyboard.press('Escape');
  await expect(ui.preview).toHaveCount(0);
  await ui.page.mouse.move(5, 5);
  await linkTo(ui, 'Cible').hover();
  await expect(ui.preview).toBeVisible();
  await ui.page.mouse.move(640, 700);
  await ui.page.mouse.wheel(0, 200);
  await expect(ui.preview).toHaveCount(0);
});

recette('13.11', async ({ app, ui }) => {
  const filler = Array.from({ length: 60 }, (_, i) => `Remplissage ${i}.`).join('\n\n');
  await reading(app, ui, `${filler}\n\nEn bas : [[Cible]].\n\n${filler}`);
  const link = linkTo(ui, 'Cible');
  // Scroll so that the link sits just above the bottom edge of the window.
  await link.evaluate((el) => {
    const scroller = el.closest('.note-scroll')!;
    scroller.scrollTop += el.getBoundingClientRect().bottom - (window.innerHeight - 30);
  });
  await link.hover();
  await expect(ui.preview).toBeVisible();
  const [preview, anchor] = [(await ui.preview.boundingBox())!, (await link.boundingBox())!];
  expect(anchor.y).toBeGreaterThan(600);
  expect(preview.y + preview.height).toBeLessThanOrEqual(anchor.y + 1);
  expect(preview.y).toBeGreaterThanOrEqual(0);
});

recette('13.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault({ 'Essai.md': 'Voir [[Idées]] ici\n\nfin' }) });
  await ui.open('Essai');
  await ui.editEnd();
  const link = ui.editor.locator('.cm-wikilink', { hasText: 'Idées' });
  await link.hover();
  await ui.page.waitForTimeout(700);
  await expect(ui.preview).toHaveCount(0);
  await ui.page.mouse.move(5, 5);
  await ui.page.keyboard.down('Control');
  await link.hover();
  await expect(ui.preview).toBeVisible();
  await ui.page.keyboard.up('Control');
});

recette('13.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Idées');
  await ui.margin.locator('.backlinks .margin-link', { hasText: 'Bienvenue' }).hover();
  await expect(ui.preview).toContainText('Voir le');
});
