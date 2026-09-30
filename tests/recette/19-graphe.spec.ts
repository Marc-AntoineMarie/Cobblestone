import { expect, recette } from './lib/recette';
import { contrast, Graph, inkVar, near, rgbOf } from './lib/graph';
import { baseVault, manyNotes, PNG } from './lib/vaults';
import type { Cobble, Files } from './lib/cobble';
import type { Ui } from './lib/ui';

// 19. Graphe

const NOTES = [
  'Bienvenue.md',
  'Idées.md',
  'Journal/2026-09-29.md',
  'Modèles/Quotidien.md',
  'Projets/Plan.md',
  'Projets/Réunion.md',
  'Étude.md',
].sort();

/** Opens the graph of a vault and waits for it to come to rest. */
async function graphOf(app: Cobble, ui: Ui, vault: Files = baseVault(), preferences?: Record<string, unknown>) {
  await app.start({ vault, ...(preferences ? { preferences } : {}) });
  await ui.page.keyboard.press('Control+g');
  const graph = new Graph(ui);
  await graph.settle();
  return graph;
}

recette('19.1', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  const drawing = await graph.drawing();
  expect(drawing.nodes.map((n) => n.id).sort()).toEqual(NOTES);
  // Bienvenue → Plan and Idées, Plan → Bienvenue, Réunion → Plan.
  expect(drawing.links).toHaveLength(4);
  // Everything is in frame.
  for (const n of drawing.nodes) {
    expect(n.sx - n.radius, n.id).toBeGreaterThanOrEqual(0);
    expect(n.sy - n.radius, n.id).toBeGreaterThanOrEqual(0);
    expect(n.sx + n.radius, n.id).toBeLessThanOrEqual(drawing.width);
    expect(n.sy + n.radius, n.id).toBeLessThanOrEqual(drawing.height);
  }
  // Notes are printed in ink.
  const plan = await graph.node('Projets/Plan.md');
  const ink = await rgbOf(ui, await inkVar(ui, 'ink'));
  const [r, g, b, a] = await graph.pixel(plan.sx, plan.sy);
  expect(a).toBe(255);
  expect(near([r!, g!, b!], ink)).toBe(true);
});

recette('19.2', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  const radius = async (id: string) => (await graph.node(id)).radius;
  // Plan has three links, Idées one, the journal none.
  expect(await radius('Projets/Plan.md')).toBeGreaterThan(await radius('Idées.md'));
  expect(await radius('Idées.md')).toBeGreaterThan(await radius('Journal/2026-09-29.md'));
});

recette('19.3', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  const p = await graph.at('Projets/Plan.md');
  await ui.page.mouse.move(p.x, p.y);
  await expect.poll(async () => (await graph.drawing()).hovered).toBe('Projets/Plan.md');
  const drawing = await graph.drawing();
  const sharp = ['Bienvenue.md', 'Projets/Plan.md', 'Projets/Réunion.md'];
  expect(
    drawing.nodes
      .filter((n) => !n.dimmed)
      .map((n) => n.id)
      .sort(),
  ).toEqual(sharp);
  expect(
    drawing.nodes
      .filter((n) => n.labelled)
      .map((n) => n.id)
      .sort(),
  ).toEqual(sharp);
  expect(
    drawing.links
      .filter((l) => l.lit)
      .map((l) => [l.source, l.target].sort().join(' ↔ '))
      .sort(),
  ).toEqual(['Bienvenue.md ↔ Projets/Plan.md', 'Bienvenue.md ↔ Projets/Plan.md', 'Projets/Plan.md ↔ Projets/Réunion.md']);
  // On the canvas: faded points, a pink link.
  const study = drawing.nodes.find((n) => n.id === 'Étude.md')!;
  expect((await graph.pixel(study.sx, study.sy))[3]).toBeLessThan(120);
  const plan = drawing.nodes.find((n) => n.id === 'Projets/Plan.md')!;
  expect((await graph.pixel(plan.sx, plan.sy))[3]).toBe(255);
  const meeting = drawing.nodes.find((n) => n.id === 'Projets/Réunion.md')!;
  // Along the link, between the two points.
  const t = (plan.radius * drawing.view.k + 4) / Math.hypot(meeting.sx - plan.sx, meeting.sy - plan.sy);
  expect(await graph.pinkAround(plan.sx + (meeting.sx - plan.sx) * t, plan.sy + (meeting.sy - plan.sy) * t)).toBe(true);
});

recette('19.4', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  const tabs = await ui.tabs.count();
  let p = await graph.at('Idées.md');
  await ui.page.mouse.click(p.x, p.y);
  await expect(ui.activeTab).toContainText('Idées');
  await expect(ui.tabs).toHaveCount(tabs);
  // Back to the graph, then Ctrl+click.
  await ui.page.keyboard.press('Control+g');
  await graph.settle();
  const withGraph = await ui.tabs.count();
  p = await graph.at('Projets/Plan.md');
  await ui.page.keyboard.down('Control');
  await ui.page.mouse.click(p.x, p.y);
  await ui.page.keyboard.up('Control');
  await expect(ui.tabs).toHaveCount(withGraph + 1);
  await expect(ui.activeTab).toContainText('Plan');
});

/** Drags a point of the graph by a distance on screen; returns where it was dropped, in the graph's own units. */
async function dragPoint(graph: Graph, id: string, dx: number, dy: number) {
  const from = await graph.at(id);
  return dragPointTo(graph, from, { x: from.x + dx, y: from.y + dy });
}

async function dragPointTo(graph: Graph, from: { x: number; y: number }, to: { x: number; y: number }) {
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  await graph.page.mouse.move(from.x, from.y);
  await graph.page.mouse.down();
  await graph.page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 });
  await graph.page.mouse.move(from.x + dx, from.y + dy, { steps: 4 });
  await graph.page.mouse.up();
  const drawing = await graph.drawing();
  const box = (await graph.canvas.boundingBox())!;
  const { view, width, height } = drawing;
  return {
    x: (from.x + dx - box.x - width / 2 - view.x) / view.k,
    y: (from.y + dy - box.y - height / 2 - view.y) / view.k,
  };
}

recette('19.5', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  // Dropped somewhere clear, to see its ring.
  const spot = await graph.emptySpot();
  const dropped = await dragPointTo(graph, await graph.at('Étude.md'), await graph.corner(spot.x, spot.y));
  await graph.settle();
  let node = await graph.node('Étude.md');
  expect(node.pinned).toBe(true);
  expect(Math.abs(node.x - dropped.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(node.y - dropped.y)).toBeLessThanOrEqual(2);
  // A ring is printed around it, clear of the point (with the pointer away, not to light it).
  const away = await graph.corner(2, 2);
  await ui.page.mouse.move(away.x, away.y);
  await expect.poll(async () => (await graph.drawing()).hovered).toBeNull();
  const k = (await graph.drawing()).view.k;
  expect((await graph.pixel(node.sx + (node.radius + 3) * k, node.sy))[3]).toBeGreaterThan(0);
  expect((await graph.pixel(node.sx + (node.radius + 1.5) * k, node.sy))[3]).toBe(0);
  // Close the graph and open it again.
  await ui.page.keyboard.press(app.key('closeTab'));
  await expect(graph.view).toHaveCount(0);
  await ui.page.keyboard.press('Control+g');
  await graph.settle();
  node = await graph.node('Étude.md');
  expect(node.pinned).toBe(true);
  expect(Math.abs(node.x - dropped.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(node.y - dropped.y)).toBeLessThanOrEqual(2);
});

recette('19.6', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  await dragPoint(graph, 'Étude.md', 90, 60);
  await graph.settle();
  expect((await graph.node('Étude.md')).pinned).toBe(true);
  const p = await graph.at('Étude.md');
  await ui.page.mouse.dblclick(p.x, p.y);
  await expect.poll(async () => (await graph.node('Étude.md')).pinned).toBe(false);
  // The graph stays open: a double-click does not open the note.
  await expect(graph.view).toBeVisible();
  await ui.page.waitForTimeout(600);
  await expect(graph.view).toBeVisible();
  // And it stays free after reopening.
  await ui.page.keyboard.press(app.key('closeTab'));
  await ui.page.keyboard.press('Control+g');
  await graph.settle();
  expect((await graph.node('Étude.md')).pinned).toBe(false);
});

recette('19.7', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  await dragPoint(graph, 'Étude.md', 90, 60);
  await dragPoint(graph, 'Idées.md', -60, 40);
  await expect.poll(async () => (await graph.drawing()).nodes.filter((n) => n.pinned).length).toBe(2);
  await graph.view.getByRole('button', { name: 'Réinitialiser' }).click();
  await expect.poll(async () => (await graph.drawing()).nodes.filter((n) => n.pinned).length).toBe(0);
  await ui.page.keyboard.press(app.key('closeTab'));
  await ui.page.keyboard.press('Control+g');
  await graph.settle();
  expect((await graph.drawing()).nodes.filter((n) => n.pinned)).toHaveLength(0);
});

recette('19.8', async ({ app, ui }) => {
  // Enough notes for names to wait for the zoom.
  const graph = await graphOf(app, ui, manyNotes(60));
  const box = (await graph.canvas.boundingBox())!;
  const pointer = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.6 };
  await ui.page.mouse.move(pointer.x, pointer.y);
  const world = async () => {
    const { view, width, height } = await graph.drawing();
    return {
      x: (pointer.x - box.x - width / 2 - view.x) / view.k,
      y: (pointer.y - box.y - height / 2 - view.y) / view.k,
    };
  };
  // Zoom out first, then in: names show once close enough.
  await ui.page.mouse.wheel(0, 300);
  const labelled = async () => (await graph.drawing()).nodes.filter((n) => n.labelled).length;
  await expect.poll(labelled).toBe(0);
  const before = await world();
  const k0 = (await graph.drawing()).view.k;
  for (let i = 0; i < 4; i++) await ui.page.mouse.wheel(0, -300);
  await expect.poll(async () => (await graph.drawing()).view.k).toBeGreaterThan(k0 * 2);
  const after = await world();
  expect(Math.abs(after.x - before.x)).toBeLessThan(1);
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
  expect(await labelled()).toBeGreaterThan(0);
});

recette('19.9', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  const before = (await graph.drawing()).view;
  const from = await graph.corner(6, 6);
  await ui.page.mouse.move(from.x, from.y);
  await ui.page.mouse.down();
  await ui.page.mouse.move(from.x + 100, from.y + 80, { steps: 5 });
  await ui.page.mouse.up();
  const after = (await graph.drawing()).view;
  expect(after.x - before.x).toBeCloseTo(100, 0);
  expect(after.y - before.y).toBeCloseTo(80, 0);
  // Nothing was opened.
  await expect(graph.view).toBeVisible();
});

recette('19.10', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  await graph.filter.fill('plan');
  await expect.poll(() => graph.ids()).toEqual(['Projets/Plan.md']);
  await graph.filter.fill('');
  await expect.poll(() => graph.ids()).toEqual(NOTES);
});

recette('19.11', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  await graph.option('Notes isolées').uncheck();
  await expect.poll(() => graph.ids()).toEqual(['Bienvenue.md', 'Idées.md', 'Projets/Plan.md', 'Projets/Réunion.md']);
});

recette('19.12', async ({ app, ui }) => {
  const graph = await graphOf(app, ui, baseVault({ 'docs/Guide.pdf': PNG, 'docs/data.csv': 'a,b' }));
  await graph.option('Pièces jointes').check();
  await expect.poll(() => graph.ids()).toContain('assets/image.png');
  const drawing = await graph.drawing();
  const attachments = drawing.nodes.filter((n) => n.kind === 'attachment').map((n) => n.id);
  expect(attachments.sort()).toEqual(['assets/image.png', 'docs/Guide.pdf', 'docs/data.csv']);
  // Canvases are not attachments.
  expect(drawing.nodes.map((n) => n.id)).not.toContain('Tableau.canvas');
  // Grey, not ink.
  await graph.settle();
  const image = await graph.node('assets/image.png');
  const [r, g, b] = await graph.pixel(image.sx, image.sy);
  const grey = await rgbOf(ui, await inkVar(ui, 'ink-3'));
  expect(near([r!, g!, b!], grey)).toBe(true);
});

recette('19.13', async ({ app, ui }) => {
  const graph = await graphOf(app, ui, baseVault({ 'Manque.md': 'Voir [[Absente]].' }));
  await graph.option('Notes manquantes').check();
  await expect.poll(() => graph.ids()).toContain('Absente');
  expect((await graph.node('Absente')).kind).toBe('unresolved');
  await graph.settle();
  const p = await graph.at('Absente');
  await ui.page.mouse.click(p.x, p.y);
  await expect(ui.activeTab).toContainText('Absente');
  await expect.poll(() => app.exists('Absente.md')).toBe(true);
});

recette('19.14', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  await ui.open('Plan');
  await ui.noteBar.getByRole('button', { name: 'Plus' }).click();
  await ui.menuItem(/graphe autour de cette note/i).click();
  await expect(ui.panes).toHaveCount(2);
  await expect(ui.panes.nth(1).locator('.graph-view')).toBeVisible();
  const graph = new Graph(ui, ui.page.locator('.workbench'));
  await graph.settle();
  expect(await graph.ids()).toEqual(['Bienvenue.md', 'Projets/Plan.md', 'Projets/Réunion.md']);
  // The note itself is printed in pink, a little off register.
  const plan = await graph.node('Projets/Plan.md');
  const k = (await graph.drawing()).view.k;
  expect(await graph.pinkAround(plan.sx + (plan.radius + 2.2) * k, plan.sy + k, 1)).toBe(true);
  // Two steps away: Idées, through Bienvenue.
  const depth = graph.view.getByRole('slider', { name: 'Autour de cette note' });
  await depth.fill('2');
  await expect.poll(() => graph.ids()).toEqual(['Bienvenue.md', 'Idées.md', 'Projets/Plan.md', 'Projets/Réunion.md']);
  await depth.fill('1');
  await expect.poll(() => graph.ids()).toEqual(['Bienvenue.md', 'Projets/Plan.md', 'Projets/Réunion.md']);
});

recette('19.15', async ({ app, ui }) => {
  const graph = await graphOf(app, ui);
  const layout = async () =>
    Object.fromEntries((await graph.drawing()).nodes.map((n) => [n.id, [Math.round(n.x), Math.round(n.y)]]));
  const first = await layout();
  await ui.page.keyboard.press(app.key('closeTab'));
  await expect(graph.view).toHaveCount(0);
  await ui.page.keyboard.press('Control+g');
  await graph.settle();
  expect(await layout()).toEqual(first);
});

recette('19.16', async ({ app, ui }) => {
  const graph = await graphOf(app, ui, baseVault(), { theme: 'night', language: 'auto' });
  const paper = await rgbOf(ui, await inkVar(ui, 'paper'));
  const plan = await graph.node('Projets/Plan.md');
  const [r, g, b] = await graph.pixel(plan.sx, plan.sy);
  // Light points on the dark paper.
  expect(contrast([r!, g!, b!], paper)).toBeGreaterThanOrEqual(4.5);
  expect(r! + g! + b!).toBeGreaterThan(paper[0]! + paper[1]! + paper[2]!);
  expect(contrast(await rgbOf(ui, await inkVar(ui, 'ink-2')), paper)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(await rgbOf(ui, await inkVar(ui, 'ink-3')), paper)).toBeGreaterThanOrEqual(3);
});

recette('19.17', async ({ app, ui }, testInfo) => {
  testInfo.setTimeout(120_000); // preparing 3 000 notes takes a while
  await app.start({ vault: manyNotes(3000) });
  const started = Date.now();
  await ui.page.keyboard.press('Control+g');
  const graph = new Graph(ui);
  await expect.poll(async () => (await graph.drawing().catch(() => null))?.nodes.length ?? 0).toBe(3000);
  expect(Date.now() - started).toBeLessThan(10_000);
  // Zooming and panning answer at once, even while the layout still moves.
  const box = (await graph.canvas.boundingBox())!;
  const spent = await graph.canvas.evaluate(
    (el, at) => {
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const t = performance.now();
        el.dispatchEvent(
          new WheelEvent('wheel', { deltaY: -120, clientX: at.x, clientY: at.y, bubbles: true, cancelable: true }),
        );
        times.push(performance.now() - t);
      }
      return Math.max(...times);
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
  expect(spent).toBeLessThan(100);
  const k = (await graph.drawing()).view.k;
  expect(k).toBeGreaterThan(0);
  const from = await graph.corner(6, 6);
  await ui.page.mouse.move(from.x, from.y);
  await ui.page.mouse.down();
  await ui.page.mouse.move(from.x + 120, from.y + 60, { steps: 4 });
  await ui.page.mouse.up();
  await expect(graph.view).toBeVisible();
});

recette('19.18', async ({ app, ui }) => {
  await app.start({ vault: baseVault() });
  // The note on the left, the graph on the right.
  await ui.open('Idées');
  await ui.page.keyboard.press('Control+\\');
  await ui.page.keyboard.press('Control+g');
  await expect(ui.panes.nth(1).locator('.graph-view')).toBeVisible();
  // Wherever the panes go, there is one graph.
  const graph = new Graph(ui, ui.page.locator('.workbench'));
  await graph.settle();
  await ui.panes.nth(0).locator('.cm-content').click();
  // Create.
  await ui.contextMenu('Journal', 'Nouvelle note ici');
  await expect.poll(() => graph.ids()).toContain('Journal/Sans titre.md');
  // Rename.
  await ui.contextMenu('Journal/Sans titre.md', 'Renommer');
  await ui.page.locator('.tree-rename').fill('Nommée');
  await ui.page.locator('.tree-rename').press('Enter');
  await expect.poll(() => graph.ids()).toContain('Journal/Nommée.md');
  expect(await graph.ids()).not.toContain('Journal/Sans titre.md');
  // Delete.
  await ui.contextMenu('Journal/Nommée.md', 'Mettre à la corbeille');
  await expect.poll(() => graph.ids()).toEqual(NOTES);
  await expect(graph.view).toBeVisible();
});
