import { expect, type Locator } from '@playwright/test';
import type { Cobble } from './cobble';
import type { Ui } from './ui';

export interface Point {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  type: 'text' | 'file' | 'link' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  file?: string;
  url?: string;
  label?: string;
  color?: string;
  background?: string;
}

export interface Edge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  label?: string;
  color?: string;
}

export interface CanvasData {
  nodes: Node[];
  edges: Edge[];
}

/** A .canvas file, written the way Obsidian writes them. */
export function canvasFile(nodes: Node[], edges: Edge[] = []): string {
  return JSON.stringify({ nodes, edges }, null, '\t');
}

/** Three cards: A and B side by side and linked, C under A. */
export const CARDS = canvasFile(
  [
    { id: 'a', type: 'text', text: 'Carte A', x: 0, y: 0, width: 200, height: 100 },
    { id: 'b', type: 'text', text: 'Carte B', x: 400, y: 0, width: 200, height: 100 },
    { id: 'c', type: 'text', text: 'Carte C', x: 0, y: 300, width: 200, height: 100 },
  ],
  [{ id: 'ab', fromNode: 'a', fromSide: 'right', toNode: 'b', toSide: 'left' }],
);

/**
 * One open canvas: where its cards are on screen, and what its file holds.
 * World points are canvas coordinates, as saved in the file.
 */
export class Sheet {
  constructor(
    private readonly app: Cobble,
    private readonly ui: Ui,
    readonly path: string,
  ) {}

  get page() {
    return this.ui.page;
  }
  get view() {
    return this.ui.view.locator('.canvas-view');
  }
  get nodes() {
    return this.view.locator('.canvas-node');
  }
  node(id: string) {
    return this.view.locator(`.canvas-node[data-node-id="${id}"]`);
  }
  get selected() {
    return this.view.locator('.canvas-node.is-selected');
  }
  get edges() {
    return this.view.locator('.canvas-edge');
  }
  get labels() {
    return this.view.locator('.canvas-edge-label');
  }
  get editor() {
    return this.view.locator('.canvas-text-editor');
  }
  get groupInput() {
    return this.view.locator('.canvas-group-label.is-input');
  }
  get zoom() {
    return this.view.locator('.canvas-zoom');
  }
  get selectionBar() {
    return this.view.locator('.canvas-selection-bar');
  }
  get empty() {
    return this.view.locator('.canvas-empty');
  }
  button(name: string) {
    return this.view.getByRole('button', { name, exact: true });
  }

  /** Opens the canvas from the file tree and waits for it to be framed. */
  async open() {
    await this.ui.row(this.path).click();
    await expect(this.view).toBeVisible();
    await this.settle();
  }

  /** Waits for the view to stop moving (first framing, redraws). */
  async settle() {
    let last = '';
    await expect
      .poll(async () => {
        const now = JSON.stringify(await this.viewport());
        const same = now === last;
        last = now;
        return same;
      })
      .toBe(true);
  }

  /** The saved file (read again when caught in the middle of a write). */
  async data(): Promise<CanvasData> {
    for (let attempt = 0; ; attempt++) {
      try {
        return JSON.parse(await this.app.read(this.path)) as CanvasData;
      } catch (error) {
        if (attempt === 4) throw error;
        await this.page.waitForTimeout(100);
      }
    }
  }

  /** Polls the saved file (saving waits for a short pause). */
  saved<T>(pick: (data: CanvasData) => T): ReturnType<typeof expect.poll<T>> {
    return expect.poll(async () => pick(await this.data().catch(() => ({ nodes: [], edges: [] }))));
  }

  /** Pan and zoom of the sheet, read from the world's transform. */
  async viewport() {
    return this.view.locator('.canvas-world').evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return { x: m.e, y: m.f, zoom: m.a };
    });
  }

  /** Screen position of a world point. */
  async at(x: number, y: number): Promise<Point> {
    const box = (await this.view.boundingBox())!;
    const v = await this.viewport();
    return { x: box.x + v.x + x * v.zoom, y: box.y + v.y + y * v.zoom };
  }

  /** World point under a screen position. */
  async world(p: Point): Promise<Point> {
    const box = (await this.view.boundingBox())!;
    const v = await this.viewport();
    return { x: (p.x - box.x - v.x) / v.zoom, y: (p.y - box.y - v.y) / v.zoom };
  }

  /** Screen offset for a distance in world units. */
  async scaled(dx: number, dy: number): Promise<Point> {
    const { zoom } = await this.viewport();
    return { x: dx * zoom, y: dy * zoom };
  }

  /** Asserts that a screen point shows the bare sheet, not a card or a toolbar. */
  async expectBackground(p: Point) {
    const bare = await this.view.evaluate((view, p) => document.elementFromPoint(p.x, p.y) === view, p);
    expect(bare, `(${Math.round(p.x)}, ${Math.round(p.y)}) sur le fond`).toBe(true);
  }

  async center(target: Locator): Promise<Point> {
    const box = (await target.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  /** Presses at a point, moves in steps, releases. `during` runs before the release. */
  async drag(from: Point, to: Point, during?: () => Promise<unknown>) {
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await this.page.mouse.move(to.x, to.y, { steps: 4 });
    if (during) await during();
    await this.page.mouse.up();
  }

  /** Drags a card by a distance in world units. */
  async dragBy(target: Locator, dx: number, dy: number) {
    const from = await this.center(target);
    const d = await this.scaled(dx, dy);
    await this.drag(from, { x: from.x + d.x, y: from.y + d.y });
  }

  /** A point on an edge's curve, at a fraction of its length (the label sits at the middle). */
  async onEdge(index: number, t = 0.25): Promise<Point> {
    return this.edges
      .nth(index)
      .locator('.canvas-edge-hit')
      .evaluate((path: SVGPathElement, t) => {
        const p = path.getPointAtLength(path.getTotalLength() * t);
        const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
        return { x: screen.x, y: screen.y };
      }, t);
  }

  /** Clicks the sheet somewhere bare, to leave editing or clear the selection. */
  async clickBackground(x: number, y: number) {
    const p = await this.at(x, y);
    await this.expectBackground(p);
    await this.page.mouse.click(p.x, p.y);
  }
}

/** The computed colour of one of the theme's inks ("pink", "ink"…). */
export function ink(ui: Ui, name: string): Promise<string> {
  return ui.page.evaluate((name) => {
    const probe = document.createElement('span');
    probe.style.color = `var(--${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);
}
