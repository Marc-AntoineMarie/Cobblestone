import { expect, recette } from './lib/recette';
import { CARDS, canvasFile, ink, Sheet, type CanvasData } from './lib/canvas';
import { baseVault, PNG } from './lib/vaults';
import type { Cobble, Files } from './lib/cobble';
import type { Ui } from './lib/ui';

// 20. Canvas

/** Opens a vault with the three cards of CARDS (A and B linked, C under A), plus `extra`. */
async function cards(app: Cobble, ui: Ui, extra: Files = {}, file = 'Cartes.canvas') {
  await app.start({ vault: baseVault({ 'Cartes.canvas': CARDS, ...extra }) });
  const sheet = new Sheet(app, ui, file);
  await sheet.open();
  return sheet;
}

const find = (d: CanvasData, id: string) => d.nodes.find((n) => n.id === id);
const pos = (d: CanvasData, id: string) => [find(d, id)?.x, find(d, id)?.y];
const size = (d: CanvasData, id: string) => [find(d, id)?.width, find(d, id)?.height];
const added = (d: CanvasData) => d.nodes.filter((n) => !['a', 'b', 'c'].includes(n.id));

/** True when every card is inside the sheet's visible area. */
async function allInView(sheet: Sheet) {
  const view = (await sheet.view.boundingBox())!;
  const boxes = await sheet.nodes.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
  return boxes.every(
    (b) =>
      b.left >= view.x - 1 && b.top >= view.y - 1 && b.right <= view.x + view.width + 1 && b.bottom <= view.y + view.height + 1,
  );
}

recette('20.1', async ({ app, ui }) => {
  await app.start({ vault: 'demo' });
  const sheet = new Sheet(app, ui, 'Carte des idées.canvas');
  await sheet.open();
  expect(await sheet.view.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('radial-gradient');
  await expect(sheet.node('g')).toHaveClass(/is-group/);
  await expect(sheet.node('g')).toContainText('Exemple');
  await expect(sheet.view.locator('.canvas-node.is-colored')).toHaveCount(2);
  await expect(sheet.node('b').locator('.canvas-file-title')).toContainText('Jardin partagé');
  await expect(sheet.node('b').locator('.canvas-body')).not.toBeEmpty();
  await expect(sheet.edges).toHaveCount(1);
  await expect(sheet.edges.locator('.canvas-edge-arrow')).toHaveCount(1);
  await expect(sheet.labels).toHaveText('mène à');
  expect(await allInView(sheet)).toBe(true);
});

recette('20.2', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.command('Créer un canvas');
  await expect(ui.activeTab).toContainText('Sans titre');
  await expect.poll(() => app.exists('Sans titre.canvas')).toBe(true);
  await expect(ui.view.locator('.canvas-empty')).toHaveText(
    'Double-clique pour ajouter une carte, ou glisse ici des notes et des images.',
  );
});

recette('20.3', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.contextMenu('Projets', 'Nouveau canvas ici');
  await expect.poll(() => app.exists('Projets/Sans titre.canvas')).toBe(true);
  await expect(ui.view.locator('.canvas-view')).toBeVisible();
});

recette('20.4', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const before = await sheet.viewport();
  const from = await sheet.at(300, 200);
  await sheet.expectBackground(from);
  await sheet.drag(from, { x: from.x + 60, y: from.y + 40 });
  const after = await sheet.viewport();
  expect(after.x - before.x).toBeCloseTo(60, 0);
  expect(after.y - before.y).toBeCloseTo(40, 0);
  expect(after.zoom).toBe(before.zoom);
});

recette('20.5', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const p = await sheet.at(300, 200);
  await ui.page.mouse.move(p.x, p.y);
  const v0 = await sheet.viewport();
  await ui.page.mouse.wheel(0, 120);
  await expect.poll(async () => (await sheet.viewport()).y).toBeCloseTo(v0.y - 120, 0);
  expect((await sheet.viewport()).x).toBe(v0.x);
  // Shift turns the wheel sideways.
  await ui.page.keyboard.down('Shift');
  await ui.page.mouse.wheel(0, 120);
  await ui.page.keyboard.up('Shift');
  await expect.poll(async () => (await sheet.viewport()).x).toBeCloseTo(v0.x - 120, 0);
  expect((await sheet.viewport()).y).toBeCloseTo(v0.y - 120, 0);
  // A touchpad scrolls sideways by itself.
  await ui.page.mouse.wheel(80, 0);
  await expect.poll(async () => (await sheet.viewport()).x).toBeCloseTo(v0.x - 200, 0);
});

recette('20.6', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const p = await sheet.at(300, 200);
  const z0 = (await sheet.viewport()).zoom;
  await ui.page.mouse.move(p.x, p.y);
  await ui.page.keyboard.down('Control');
  await ui.page.mouse.wheel(0, -50);
  await ui.page.keyboard.up('Control');
  await expect.poll(async () => (await sheet.viewport()).zoom).toBeGreaterThan(z0);
  // What was under the pointer stays under it.
  const w = await sheet.world(p);
  expect(w.x).toBeCloseTo(300, 0);
  expect(w.y).toBeCloseTo(200, 0);
  await expect(sheet.zoom).toHaveText(`${Math.round((await sheet.viewport()).zoom * 100)} %`);
});

recette('20.7', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const z0 = (await sheet.viewport()).zoom;
  await sheet.button('Dézoomer').click();
  await expect.poll(async () => (await sheet.viewport()).zoom).toBeCloseTo(z0 / 1.25, 3);
  await expect(sheet.zoom).toHaveText(`${Math.round((z0 / 1.25) * 100)} %`);
  await sheet.button('Zoomer').click();
  await sheet.button('Zoomer').click();
  await expect.poll(async () => (await sheet.viewport()).zoom).toBeCloseTo(z0 * 1.25, 3);
  // Wander off, then show everything again.
  const p = await sheet.at(300, 200);
  await ui.page.mouse.move(p.x, p.y);
  await ui.page.mouse.wheel(0, 2000);
  await expect.poll(() => allInView(sheet)).toBe(false);
  await sheet.button('Tout afficher').click();
  await expect.poll(() => allInView(sheet)).toBe(true);
});

recette('20.8', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const p = await sheet.at(300, 200);
  await sheet.expectBackground(p);
  await ui.page.mouse.dblclick(p.x, p.y);
  await expect(sheet.nodes).toHaveCount(4);
  await expect(sheet.editor).toBeFocused();
  await sheet.saved((d) => added(d).map((n) => [n.type, n.x, n.y])).toEqual([['text', 300, 200]]);
});

recette('20.9', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const p = await sheet.at(300, 200);
  await ui.page.mouse.dblclick(p.x, p.y);
  await ui.page.keyboard.type('# Titre\n**gras** et [[Idées]] #étiquette');
  await ui.page.keyboard.press('Escape');
  const body = sheet.nodes.last().locator('.canvas-body');
  await expect(body.locator('h1')).toHaveText('Titre');
  await expect(body.locator('strong')).toHaveText('gras');
  await expect(body.locator('a.tag')).toHaveText('#étiquette');
  await sheet.saved((d) => added(d)[0]?.text).toBe('# Titre\n**gras** et [[Idées]] #étiquette');
  // Clicking outside also ends the writing.
  await sheet.node('b').dblclick();
  await ui.page.keyboard.type(' modifiée');
  await sheet.clickBackground(300, 150);
  await expect(sheet.node('b').locator('.canvas-body')).toHaveText('Carte B modifiée');
  // Links of a card lead somewhere.
  await body.locator('a.internal-link', { hasText: 'Idées' }).click();
  await expect(ui.activeTab).toContainText('Idées');
});

recette('20.10', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').dblclick();
  await expect(sheet.editor).toBeFocused();
  await expect(sheet.editor).toHaveValue('Carte A');
});

recette('20.11', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  await expect(sheet.editor).toHaveCount(0);
  await ui.page.keyboard.press('Enter');
  await expect(sheet.editor).toBeFocused();
  await expect(sheet.editor).toHaveValue('Carte A');
});

recette('20.12', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const pink = await ink(ui, 'accent');
  const card = sheet.node('a');
  await card.click();
  // The pointer leaves: what shows comes from the selection, not the hover.
  const away = await sheet.at(300, 200);
  await ui.page.mouse.move(away.x, away.y);
  expect(await card.evaluate((el) => getComputedStyle(el).outlineColor)).toBe(pink);
  await expect
    .poll(() => card.locator('.canvas-port').evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity)))
    .toEqual(['1', '1', '1', '1']);
  const corner = card.locator('.canvas-resize');
  await expect(corner).toBeVisible();
  expect(await corner.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(pink);
  await expect(sheet.selectionBar).toBeVisible();
  await expect(sheet.selectionBar.locator('.canvas-swatch')).toHaveCount(7);
  await expect(sheet.node('b').locator('.canvas-resize')).toHaveCount(0);
});

recette('20.13', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  await sheet.node('b').click({ modifiers: ['Shift'] });
  await sheet.node('c').click({ modifiers: ['Shift'] });
  await expect(sheet.selected).toHaveCount(3);
  await sheet.node('b').click({ modifiers: ['Shift'] });
  await expect(sheet.selected).toHaveCount(2);
  await expect(sheet.node('b')).not.toHaveClass(/is-selected/);
});

recette('20.14', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const pink = await ink(ui, 'accent');
  const from = await sheet.at(-30, 50);
  await sheet.expectBackground(from);
  const band = sheet.view.locator('.canvas-band');
  await ui.page.keyboard.down('Shift');
  await sheet.drag(from, await sheet.at(450, 60), async () => {
    await expect(band).toBeVisible();
    expect(await band.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(pink);
  });
  await ui.page.keyboard.up('Shift');
  await expect(band).toHaveCount(0);
  await expect(sheet.selected).toHaveCount(2);
  await expect(sheet.node('c')).not.toHaveClass(/is-selected/);
});

recette('20.15', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  await ui.page.keyboard.press('Control+a');
  await expect(sheet.selected).toHaveCount(3);
  await ui.page.keyboard.press('Escape');
  await expect(sheet.selected).toHaveCount(0);
});

recette('20.16', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.dragBy(sheet.node('a'), 37, 23);
  await sheet.saved((d) => pos(d, 'a')).toEqual([40, 20]);
  // Alt frees the move from the grid.
  await ui.page.keyboard.down('Alt');
  await sheet.dragBy(sheet.node('a'), 37, 23);
  await ui.page.keyboard.up('Alt');
  await sheet.saved((d) => pos(d, 'a')).not.toEqual([40, 20]);
  const [x, y] = pos(await sheet.data(), 'a') as [number, number];
  expect(Math.abs(x - 77)).toBeLessThanOrEqual(2);
  expect(Math.abs(y - 43)).toBeLessThanOrEqual(2);
  expect(x % 20 !== 0 || y % 20 !== 0).toBe(true);
});

recette('20.17', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  await sheet.node('b').click({ modifiers: ['Shift'] });
  await sheet.dragBy(sheet.node('a'), 40, 40);
  await sheet
    .saved((d) => ['a', 'b', 'c'].map((id) => pos(d, id)))
    .toEqual([
      [40, 40],
      [440, 40],
      [0, 300],
    ]);
});

const GROUP = canvasFile([
  { id: 'g', type: 'group', label: 'Mon groupe', x: -40, y: -60, width: 300, height: 200 },
  { id: 'a', type: 'text', text: 'Dedans', x: 0, y: 0, width: 200, height: 100 },
  { id: 'c', type: 'text', text: 'Dehors', x: 400, y: 0, width: 200, height: 100 },
]);

recette('20.18', async ({ app, ui }) => {
  const sheet = await cards(app, ui, { 'Groupe.canvas': GROUP }, 'Groupe.canvas');
  await sheet.dragBy(sheet.node('g').locator('.canvas-group-label'), 60, 40);
  await sheet
    .saved((d) => ['g', 'a', 'c'].map((id) => pos(d, id)))
    .toEqual([
      [20, -20],
      [60, 40],
      [400, 0],
    ]);
});

recette('20.19', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  await ui.page.keyboard.press('ArrowRight');
  await ui.page.keyboard.press('ArrowDown');
  await sheet.saved((d) => pos(d, 'a')).toEqual([20, 20]);
  await ui.page.keyboard.press('Shift+ArrowLeft');
  await ui.page.keyboard.press('Shift+ArrowUp');
  await sheet.saved((d) => pos(d, 'a')).toEqual([19, 19]);
});

recette('20.20', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  const corner = sheet.node('a').locator('.canvas-resize');
  let from = await sheet.center(corner);
  let d = await sheet.scaled(100, 60);
  await sheet.drag(from, { x: from.x + d.x, y: from.y + d.y });
  await sheet.saved((data) => size(data, 'a')).toEqual([300, 160]);
  // Too small: it stops at the smallest size.
  from = await sheet.center(corner);
  d = await sheet.scaled(-250, -150);
  await sheet.drag(from, { x: from.x + d.x, y: from.y + d.y });
  await sheet.saved((data) => size(data, 'a')).toEqual([80, 40]);
});

recette('20.21', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const pink = await ink(ui, 'accent');
  const wire = sheet.view.locator('.canvas-edge-line.is-wire');
  // From the right side of C (bottom left) to the middle of B (top right).
  await sheet.drag(
    await sheet.center(sheet.node('c').locator('.canvas-port.is-right')),
    await sheet.center(sheet.node('b')),
    async () => {
      await expect(wire).toHaveCount(1);
      const style = await wire.evaluate((el) => [getComputedStyle(el).stroke, getComputedStyle(el).strokeDasharray]);
      expect(style[0]).toBe(pink);
      expect(style[1]).not.toBe('none');
    },
  );
  await expect(wire).toHaveCount(0);
  await expect(sheet.edges).toHaveCount(2);
  await sheet
    .saved((d) => d.edges.filter((e) => e.id !== 'ab').map((e) => [e.fromNode, e.fromSide, e.toNode, e.toSide]))
    .toEqual([['c', 'right', 'b', 'bottom']]);
});

recette('20.22', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const port = sheet.node('c').locator('.canvas-port.is-right');
  await sheet.drag(await sheet.center(port), await sheet.at(300, 200));
  await sheet.drag(await sheet.center(port), await sheet.center(sheet.node('c')));
  await expect(sheet.edges).toHaveCount(1);
  await ui.page.waitForTimeout(700);
  expect((await sheet.data()).edges).toHaveLength(1);
});

recette('20.23', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const p = await sheet.onEdge(0);
  await ui.page.mouse.click(p.x, p.y);
  await expect(sheet.edges.first()).toHaveClass(/is-selected/);
  const stroke = await sheet.edges
    .first()
    .locator('.canvas-edge-line')
    .evaluate((el) => getComputedStyle(el).stroke);
  expect(stroke).toBe(await ink(ui, 'accent'));
});

recette('20.24', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const p = await sheet.onEdge(0);
  await ui.page.mouse.dblclick(p.x, p.y);
  const input = sheet.labels.locator('input');
  await expect(input).toBeFocused();
  await ui.page.keyboard.type('relie');
  await ui.page.keyboard.press('Enter');
  await expect(sheet.labels).toHaveText('relie');
  // The label sits halfway along the arrow.
  const middle = await sheet.onEdge(0, 0.5);
  const label = await sheet.center(sheet.labels);
  expect(Math.abs(label.x - middle.x)).toBeLessThan(3);
  expect(Math.abs(label.y - middle.y)).toBeLessThan(3);
  await sheet.saved((d) => d.edges[0]?.label).toBe('relie');
  // Emptying it takes it away.
  await sheet.labels.locator('span').dblclick();
  await sheet.labels.locator('input').fill('');
  await sheet.labels.locator('input').press('Enter');
  await expect(sheet.labels).toHaveCount(0);
  await sheet.saved((d) => d.edges[0] && 'label' in d.edges[0]).toBe(false);
});

recette('20.25', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const sheet = new Sheet(app, ui, 'Tableau.canvas');
  await sheet.open();
  await sheet.labels.locator('span').dblclick();
  const input = sheet.labels.locator('input');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('mène à');
});

recette('20.26', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  await ui.page.keyboard.press('Delete');
  await expect(sheet.node('a')).toHaveCount(0);
  await expect(sheet.edges).toHaveCount(0);
  await sheet.saved((d) => [d.nodes.map((n) => n.id), d.edges.length]).toEqual([['b', 'c'], 0]);
  // An arrow alone, with Backspace.
  await ui.page.keyboard.press('Control+z');
  await expect(sheet.edges).toHaveCount(1);
  const p = await sheet.onEdge(0);
  await ui.page.mouse.click(p.x, p.y);
  await ui.page.keyboard.press('Backspace');
  await expect(sheet.edges).toHaveCount(0);
  await expect(sheet.nodes).toHaveCount(3);
  await sheet.saved((d) => [d.nodes.length, d.edges.length]).toEqual([3, 0]);
});

recette('20.27', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  await sheet.button('Couleur 1').click();
  await sheet.saved((d) => find(d, 'a')?.color).toBe('1');
  await expect(sheet.button('Couleur 1')).toHaveClass(/is-current/);
  expect(await sheet.node('a').evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(await ink(ui, 'red'));
  await sheet.button('Sans couleur').click();
  await sheet.saved((d) => 'color' in find(d, 'a')!).toBe(false);
  await expect(sheet.button('Sans couleur')).toHaveClass(/is-current/);
  // Arrows take colours too.
  const p = await sheet.onEdge(0);
  await ui.page.mouse.click(p.x, p.y);
  await sheet.button('Couleur 4').click();
  await sheet.saved((d) => d.edges[0]?.color).toBe('4');
  await sheet.clickBackground(300, 200);
  const stroke = await sheet.edges
    .first()
    .locator('.canvas-edge-line')
    .evaluate((el) => getComputedStyle(el).stroke);
  expect(stroke).toBe(await ink(ui, 'green'));
});

recette('20.28', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  await sheet.node('b').click({ modifiers: ['Shift'] });
  await sheet.button('Grouper la sélection').click();
  await expect(sheet.groupInput).toBeFocused();
  await ui.page.keyboard.type('Ensemble');
  await ui.page.keyboard.press('Enter');
  await sheet
    .saved((d) => d.nodes.filter((n) => n.type === 'group').map((n) => [n.label, n.x, n.y, n.width, n.height]))
    .toEqual([['Ensemble', -40, -60, 680, 200]]);
  // Ctrl+G groups too, rather than opening the graph.
  await sheet.node('c').click();
  await ui.page.keyboard.press('Control+g');
  await expect(sheet.groupInput).toBeFocused();
  await expect(ui.view.locator('.graph-view')).toHaveCount(0);
  await ui.page.keyboard.press('Escape');
  await sheet.saved((d) => d.nodes.filter((n) => n.type === 'group').length).toBe(2);
});

recette('20.29', async ({ app, ui }) => {
  const sheet = await cards(app, ui, { 'Groupe.canvas': GROUP }, 'Groupe.canvas');
  const label = sheet.node('g').locator('.canvas-group-label');
  await label.dblclick();
  await expect(sheet.groupInput).toHaveValue('Mon groupe');
  await sheet.groupInput.fill('Renommé');
  await sheet.groupInput.press('Enter');
  await expect(label).toHaveText('Renommé');
  await sheet.saved((d) => find(d, 'g')?.label).toBe('Renommé');
  // Escape keeps the new name too.
  await label.dblclick();
  await sheet.groupInput.fill('Encore');
  await sheet.groupInput.press('Escape');
  await expect(label).toHaveText('Encore');
  await sheet.saved((d) => find(d, 'g')?.label).toBe('Encore');
});

recette('20.30', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.node('a').click();
  await sheet.node('b').click({ modifiers: ['Shift'] });
  await ui.page.keyboard.press('Control+d');
  await expect(sheet.nodes).toHaveCount(5);
  await expect(sheet.edges).toHaveCount(2);
  await sheet
    .saved((d) => added(d).map((n) => [n.text, n.x, n.y]))
    .toEqual([
      ['Carte A', 40, 40],
      ['Carte B', 440, 40],
    ]);
  // The copies are selected: the button copies them again, their arrow with them.
  await sheet.button('Dupliquer').click();
  await expect(sheet.nodes).toHaveCount(7);
  await expect(sheet.edges).toHaveCount(3);
});

recette('20.31', async ({ app, ui }, testInfo) => {
  testInfo.setTimeout(90_000); // six actions, each undone and redone three times
  const sheet = await cards(app, ui);
  const state = async () => JSON.stringify(await sheet.data());
  const keys = ui.page.keyboard;
  /** Does something, then checks that undo and both redo shortcuts go back and forth. */
  async function roundTrip(what: string, action: () => Promise<unknown>) {
    const before = await state();
    await action();
    await expect.poll(state, { message: what }).not.toBe(before);
    await ui.page.waitForTimeout(500);
    const after = await state();
    await keys.press('Control+z');
    await expect.poll(state, { message: `${what} : annuler` }).toBe(before);
    await keys.press('Control+Shift+z');
    await expect.poll(state, { message: `${what} : Ctrl+Maj+Z` }).toBe(after);
    await keys.press('Control+z');
    await expect.poll(state, { message: `${what} : annuler` }).toBe(before);
    await keys.press('Control+y');
    await expect.poll(state, { message: `${what} : Ctrl+Y` }).toBe(after);
  }
  await roundTrip('déplacer', () => sheet.dragBy(sheet.node('a'), 40, 0));
  await roundTrip('redimensionner', async () => {
    const from = await sheet.center(sheet.node('a').locator('.canvas-resize'));
    const d = await sheet.scaled(60, 40);
    await sheet.drag(from, { x: from.x + d.x, y: from.y + d.y });
  });
  await roundTrip('colorer', () => sheet.button('Couleur 2').click());
  await roundTrip('texte', async () => {
    await sheet.node('b').dblclick();
    await keys.type(' !');
    await keys.press('Escape');
  });
  await roundTrip('flèche', () =>
    sheet
      .center(sheet.node('c').locator('.canvas-port.is-right'))
      .then(async (from) => sheet.drag(from, await sheet.center(sheet.node('b')))),
  );
  await roundTrip('supprimer', async () => {
    await sheet.node('c').click();
    await keys.press('Delete');
  });
});

recette('20.32', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  await sheet.button('Ajouter une note ou une image').click();
  await expect(ui.palette.locator('input')).toHaveAttribute('placeholder', 'Choisir une note ou une image à ajouter');
  await expect(ui.palette.locator('.finder-item', { hasText: 'image.png' })).toHaveCount(1);
  await expect(ui.palette.locator('.finder-item', { hasText: 'Tableau' })).toHaveCount(0);
  await ui.palette.locator('input').fill('Idées');
  await ui.palette.locator('.finder-item', { hasText: 'Idées' }).first().waitFor();
  await ui.page.keyboard.press('Enter');
  await expect(sheet.nodes).toHaveCount(4);
  const card = sheet.nodes.last();
  await expect(card.locator('.canvas-file-title')).toContainText('Idées');
  await sheet.saved((d) => added(d)[0]?.file).toBe('Idées.md');
  // It lands in the middle of the view.
  const c = await sheet.center(card);
  const v = await sheet.center(sheet.view);
  const slack = (await sheet.scaled(20, 20)).x + 2;
  expect(Math.abs(c.x - v.x)).toBeLessThanOrEqual(slack);
  expect(Math.abs(c.y - v.y)).toBeLessThanOrEqual(slack);
});

recette('20.33', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const box = (await sheet.view.boundingBox())!;
  const drop = async (row: string, x: number, y: number) => {
    const p = await sheet.at(x, y);
    await ui.row(row).dragTo(sheet.view, { targetPosition: { x: p.x - box.x, y: p.y - box.y } });
  };
  await drop('Idées.md', 300, 200);
  await expect(sheet.nodes).toHaveCount(4);
  await sheet.saved((d) => added(d).map((n) => [n.file, n.x, n.y])).toEqual([['Idées.md', 300, 200]]);
  await ui.expand('assets/image.png');
  await drop('assets/image.png', 220, 120);
  await expect(sheet.nodes.last().locator('.canvas-image')).toBeVisible();
  await sheet.saved((d) => added(d)[1]?.file).toBe('assets/image.png');
});

recette('20.34', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const before = await app.list();
  await ui.dropFiles(sheet.view, [{ name: 'photo.png', type: 'image/png', bytes: PNG }]);
  await expect(sheet.nodes).toHaveCount(4);
  await expect(sheet.nodes.last().locator('.canvas-image')).toBeVisible();
  await sheet.saved((d) => added(d)[0]?.file ?? '').toMatch(/photo.*\.png$/);
  const file = added(await sheet.data())[0]!.file!;
  expect(before).not.toContain(file);
  expect(await app.readBytes(file)).toEqual(PNG);
});

const PLAN = '9a8b7c6d5e4f3a2b';

recette('20.35', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const sheet = new Sheet(app, ui, 'Tableau.canvas');
  await sheet.open();
  await sheet.node(PLAN).locator('.canvas-file-title').click();
  await expect(ui.activeTab).toContainText('Plan');
  await expect(ui.tabs).toHaveCount(1);
  // Ctrl+click: a new tab.
  await sheet.open();
  await sheet
    .node(PLAN)
    .locator('.canvas-file-title')
    .click({ modifiers: ['Control'] });
  await expect(ui.tabs).toHaveCount(2);
  await expect(ui.activeTab).toContainText('Plan');
  // Double-click on the card: again.
  await ui.tab('Tableau').click();
  const card = sheet.node(PLAN);
  const box = (await card.boundingBox())!;
  await card.dblclick({ position: { x: box.width - 40, y: box.height - 20 } });
  await expect(ui.activeTab).toContainText('Plan');
  await expect(ui.view.locator('.canvas-view')).toHaveCount(0);
});

recette('20.36', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const sheet = new Sheet(app, ui, 'Tableau.canvas');
  await sheet.open();
  await ui.openInNewTab('Plan');
  await ui.append('\n\nAjout depuis un autre onglet');
  await ui.tab('Tableau').click();
  await expect(sheet.node(PLAN).locator('.canvas-body')).toContainText('Ajout depuis un autre onglet');
});

recette('20.37', async ({ app, ui }) => {
  const long = Array.from({ length: 60 }, (_, i) => `Ligne ${i}`).join('\n\n');
  const sheet = await cards(
    app,
    ui,
    {
      'Long.md': long,
      'Longue.canvas': canvasFile([{ id: 'n', type: 'file', file: 'Long.md', x: 0, y: 0, width: 400, height: 300 }]),
    },
    'Longue.canvas',
  );
  const body = sheet.node('n').locator('.canvas-body');
  await expect(body).toContainText('Ligne 0');
  const before = await sheet.viewport();
  await body.hover();
  await ui.page.mouse.wheel(0, 200);
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await sheet.viewport()).toEqual(before);
});

recette('20.38', async ({ app, ui }) => {
  const sheet = await cards(
    app,
    ui,
    {
      'Lien.canvas': canvasFile([
        { id: 'l', type: 'link', url: 'https://example.org/page', x: 0, y: 0, width: 400, height: 200 },
      ]),
    },
    'Lien.canvas',
  );
  const card = sheet.node('l');
  await expect(card.locator('strong')).toHaveText('example.org');
  await expect(card.locator('.canvas-link-url')).toHaveText('https://example.org/page');
  const open = card.getByRole('button', { name: 'Ouvrir', exact: true });
  if (app.desktop) {
    await app.electron.evaluate(({ shell }) => {
      (globalThis as { __external?: string[] }).__external = [];
      shell.openExternal = async (url: string) => void (globalThis as { __external?: string[] }).__external!.push(url);
    });
    await open.click();
    await expect
      .poll(() => app.electron.evaluate(() => (globalThis as { __external?: string[] }).__external))
      .toEqual(['https://example.org/page']);
  } else {
    const [popup] = await Promise.all([ui.page.waitForEvent('popup'), open.click()]);
    expect(popup.url()).toContain('example.org/page');
  }
});

recette('20.39', async ({ app, ui }) => {
  const sheet = await cards(
    app,
    ui,
    {
      'Fond.canvas': canvasFile([
        { id: 'g', type: 'group', label: 'Avec fond', background: 'assets/image.png', x: 0, y: 0, width: 400, height: 300 },
      ]),
    },
    'Fond.canvas',
  );
  const background = sheet.node('g').locator('.canvas-group-background');
  await expect(background).toBeVisible();
  const shown = await background.evaluate(async (el) => {
    const style = getComputedStyle(el);
    const url = /url\("?(.*?)"?\)/.exec(style.backgroundImage)?.[1] ?? '';
    const img = new Image();
    img.src = url;
    await img.decode();
    return { opacity: Number(style.opacity), width: img.naturalWidth };
  });
  expect(shown.width).toBe(1);
  expect(shown.opacity).toBeGreaterThan(0);
  expect(shown.opacity).toBeLessThan(1);
});

recette('20.40', async ({ app, ui }) => {
  const sheet = await cards(app, ui);
  const p = await sheet.at(300, 200);
  await ui.page.mouse.dblclick(p.x, p.y);
  await ui.page.keyboard.type('Gardée');
  await ui.page.keyboard.press('Escape');
  await sheet.dragBy(sheet.node('a'), 40, 0);
  // Close the canvas straight away, then open it again.
  await ui.page.keyboard.press(app.key('closeTab'));
  await expect(sheet.view).toHaveCount(0);
  await sheet.open();
  await expect(sheet.nodes).toHaveCount(4);
  await expect(sheet.nodes.last()).toContainText('Gardée');
  await sheet.saved((d) => pos(d, 'a')).toEqual([40, 0]);
  // And after restarting the app.
  await app.restart();
  await sheet.open();
  await expect(sheet.nodes.last()).toContainText('Gardée');
  const saved = await app.read('Cartes.canvas');
  expect(saved).toContain('\n\t"nodes"');
});

recette('20.41', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const before = await app.read('Tableau.canvas');
  const written = await app.mtime('Tableau.canvas');
  const sheet = new Sheet(app, ui, 'Tableau.canvas');
  await sheet.open();
  // Look around without changing anything.
  await sheet.node('1a2b3c4d5e6f7a8b').click();
  await sheet.button('Zoomer').click();
  const p = await sheet.at(300, 380);
  await ui.page.mouse.move(p.x, p.y);
  await ui.page.mouse.wheel(0, 100);
  await ui.page.waitForTimeout(800);
  await ui.page.keyboard.press(app.key('closeTab'));
  await ui.page.waitForTimeout(500);
  expect(await app.read('Tableau.canvas')).toBe(before);
  expect(await app.mtime('Tableau.canvas')).toBe(written);
});

recette('20.42', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  const sheet = new Sheet(app, ui, 'Tableau.canvas');
  await sheet.open();
  await ui.expand('Projets/Plan.md');
  await ui.contextMenu('Projets/Plan.md', 'Renommer');
  await ui.page.locator('.tree-rename').fill('Programme');
  await ui.page.locator('.tree-rename').press('Enter');
  await sheet.saved((d) => find(d, PLAN)?.file).toBe('Projets/Programme.md');
  await expect(sheet.node(PLAN).locator('.canvas-file-title')).toContainText('Programme');
  await expect(sheet.node(PLAN).locator('.canvas-body')).toContainText('Étapes');
});

recette('20.43', async ({ app, ui }) => {
  const vault = baseVault({ 'Cartes.canvas': CARDS });
  if (app.desktop) {
    await app.start({ vault });
  } else {
    // The browser's own storage has no other program: a real folder does.
    await app.start();
    await app.pickFolderWith('Dossier réel', vault);
    await ui.launchAction(/Ouvrir un dossier/).click();
  }
  const sheet = new Sheet(app, ui, 'Cartes.canvas');
  await sheet.open();
  const data = JSON.parse(CARDS) as CanvasData;
  data.nodes[0]!.text = 'Changée ailleurs';
  await app.write('Cartes.canvas', JSON.stringify(data, null, '\t'));
  await expect(sheet.node('a')).toContainText('Changée ailleurs', { timeout: 10_000 });
});

recette.manuel(
  '20.44',
  'ouvrir le canvas dans Obsidian lui-même ; le format JSON Canvas est vérifié par les tests unitaires et par 20.40',
);

recette('20.45', async ({ app, ui }) => {
  await app.start({ vault: baseVault(), preferences: { theme: 'night', language: 'auto' } });
  const sheet = new Sheet(app, ui, 'Tableau.canvas');
  await sheet.open();
  await expect(sheet.node(PLAN).locator('.canvas-body')).toContainText('Étapes');
  const ratios = await sheet.view.evaluate((view) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const rgb = (color: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const luminance = (color: string) => {
      const [r, g, b] = rgb(color).map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 100) / 100;
    };
    const style = (selector: string) => getComputedStyle(view.querySelector(selector)!);
    const paper = getComputedStyle(view).backgroundColor;
    const colored = style('.canvas-node.is-colored');
    const note = style('.canvas-node.is-file');
    return {
      coloredText: ratio(style('.canvas-node.is-colored .canvas-body').color, colored.backgroundColor),
      coloredBorder: ratio(colored.borderTopColor, paper),
      noteText: ratio(style('.canvas-node.is-file .canvas-body').color, note.backgroundColor),
      noteTitle: ratio(style('.canvas-file-title').color, note.backgroundColor),
      arrow: ratio(style('.canvas-edge-line').stroke, paper),
      label: ratio(style('.canvas-edge-label').color, style('.canvas-edge-label').backgroundColor),
      group: ratio(style('.canvas-group-label').color, paper),
    };
  });
  // Text 4.5:1, lines and large captions 3:1 (WCAG AA).
  expect(ratios.coloredText).toBeGreaterThanOrEqual(4.5);
  expect(ratios.noteText).toBeGreaterThanOrEqual(4.5);
  expect(ratios.noteTitle).toBeGreaterThanOrEqual(4.5);
  expect(ratios.label).toBeGreaterThanOrEqual(4.5);
  expect(ratios.coloredBorder).toBeGreaterThanOrEqual(3);
  expect(ratios.arrow).toBeGreaterThanOrEqual(3);
  expect(ratios.group).toBeGreaterThanOrEqual(3);
});
