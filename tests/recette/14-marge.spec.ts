import { expect, recette } from './lib/recette';
import { baseVault } from './lib/vaults';
import type { Cobble } from './lib/cobble';
import type { Ui } from './lib/ui';

// 14. Marge.

const LONG = Array.from({ length: 50 }, (_, i) => `Paragraphe ${i}.`).join('\n\n');

async function open(app: Cobble, ui: Ui, name: string, extra = {}) {
  await app.start({ vault: baseVault(extra) });
  await ui.open(name);
}

const backlinks = (ui: Ui) => ui.margin.locator('ul.backlinks').first();

recette('14.1', async ({ app, ui }) => {
  await open(app, ui, 'Idées');
  await ui.editor.click();
  await ui.page.keyboard.press('Control+]');
  await expect(ui.margin).toHaveCount(0);
  await ui.sideToggle('right').click();
  await expect(ui.margin).toBeVisible();
});

recette('14.2', async ({ app, ui }) => {
  await open(app, ui, 'Plan');
  await expect(ui.panel('backlinks').locator('.panel-head .count')).toHaveText('2');
  const context = backlinks(ui).locator('.backlink-context').first();
  await expect(context.locator('mark')).toBeVisible();
  await expect(context).not.toContainText('[[');
});

recette('14.3', async ({ app, ui }) => {
  await open(app, ui, 'Idées');
  const source = backlinks(ui).locator('.margin-link', { hasText: 'Bienvenue' });
  await source.click();
  await expect(ui.activeTab).toContainText('Bienvenue');
  await ui.open('Idées');
  await backlinks(ui)
    .locator('.margin-link', { hasText: 'Bienvenue' })
    .click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
});

recette('14.4', async ({ app, ui }) => {
  await open(app, ui, 'Idées', { 'Bienvenue.md': `# Bienvenue\n\n${LONG}\n\nTout en bas, les [[Idées]].\n` });
  await backlinks(ui).locator('.backlink-context').first().click();
  await expect(ui.activeTab).toContainText('Bienvenue');
  await expect(ui.lines.filter({ hasText: 'Tout en bas' })).toBeInViewport();
});

recette('14.5', async ({ app, ui }) => {
  await open(app, ui, 'Idées', { 'Tâche.md': '---\nresponsable: "[[Idées]]"\n---\nTexte.' });
  const entry = backlinks(ui).locator('li', { hasText: 'Tâche' });
  await expect(entry.locator('.backlink-property')).toHaveText('responsable');
});

recette('14.6', async ({ app, ui }) => {
  await open(app, ui, 'Étude', { 'Mention.md': 'Une étude sans lien, puis la Recherche.' });
  await ui.margin.getByRole('button', { name: /Mentions non liées/ }).click();
  await expect(ui.margin.locator('#m-unlinked .count')).toHaveText(/[1-9]/);
  await expect(ui.margin.locator('.mention-row').first()).toContainText(/étude|Recherche/i);
});

recette('14.7', async ({ app, ui }) => {
  await open(app, ui, 'Étude', { 'Mention.md': 'Une étude sans lien.' });
  await ui.margin.getByRole('button', { name: /Mentions non liées/ }).click();
  await ui.margin
    .locator('li', { hasText: 'Mention' })
    .locator('.mention-row')
    .first()
    .getByRole('button', { name: 'Lier' })
    .click();
  await expect.poll(() => app.read('Mention.md')).toBe('Une [[Étude|étude]] sans lien.');
  await expect(backlinks(ui)).toContainText('Mention');
});

recette('14.8', async ({ app, ui }) => {
  await open(app, ui, 'Étude', {
    'Codes.md': 'Du `Étude` en code.\n\n```\nÉtude\n```\n\nUn [lien](https://x.org/Étude) et %%Étude%%.',
  });
  await ui.margin.getByRole('button', { name: /Mentions non liées/ }).click();
  await expect(ui.margin.locator('li', { hasText: 'Codes' })).toHaveCount(0);
});

recette('14.9', async ({ app, ui }) => {
  await open(app, ui, 'Essai', { 'Essai.md': `# Haut\n\n${LONG}\n\n## Tout en bas\n\nfin` });
  await ui.margin.locator('.outline-item', { hasText: 'Tout en bas' }).click();
  await expect(ui.lines.filter({ hasText: 'Tout en bas' })).toBeInViewport();
  await ui.mode('Lire');
  await ui.pane.locator('.note-scroll').evaluate((el) => (el.scrollTop = 0));
  await ui.margin.locator('.outline-item', { hasText: 'Tout en bas' }).click();
  await expect(ui.reading.locator('h2', { hasText: 'Tout en bas' })).toBeInViewport({ timeout: 3000 });
});

recette('14.10', async ({ app, ui }) => {
  await open(app, ui, 'Bienvenue', { 'Bienvenue.md': 'Vers [[Idées]] et [[Pas encore]].' });
  const out = ui.margin.locator('ul.outgoing');
  await expect(out.locator('.margin-link:not(.is-unresolved)')).toHaveText(['Idées']);
  await expect(out.locator('li', { hasText: 'Pas encore' })).toContainText('pas encore créée');
  await ui.hoverForPreview(out.locator('.margin-link', { hasText: 'Idées' }));
  await ui.page.mouse.move(5, 5);
  await out.locator('.margin-link.is-unresolved').click();
  await expect.poll(() => app.exists('Pas encore.md')).toBe(true);
});

recette('14.11', async ({ app, ui }) => {
  await open(app, ui, 'Étude');
  const props = ui.margin.locator('.properties');
  await expect(props).toContainText('Recherche');
  await props.locator('.tag-chip', { hasText: 'recherche' }).click();
  await expect(ui.find).toHaveValue('tag:#recherche');
});

recette('14.12', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.row('Tableau.canvas').click();
  await expect(ui.margin.locator('.side-empty')).toContainText('Ces panneaux suivent la note ouverte');
});

recette('14.13', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), viewport: { width: 1000, height: 760 } });
  await ui.open('Idées');
  await ui.sideToggle('right').click();
  await expect(ui.margin).toHaveClass(/is-drawer/);
  const scrim = ui.page.locator('.scrim');
  await expect(scrim).toBeVisible();
  await scrim.click({ position: { x: 10, y: 10 } });
  await expect(ui.margin).toHaveCount(0);
});
