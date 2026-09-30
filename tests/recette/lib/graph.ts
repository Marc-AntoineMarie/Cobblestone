import { expect, type Locator } from '@playwright/test';
import type { Ui } from './ui';

/** What the graph drew last (GraphProbe in packages/app/src/ui/GraphView.tsx). */
export interface Drawing {
  view: { x: number; y: number; k: number };
  width: number;
  height: number;
  moving: boolean;
  hovered: string | null;
  nodes: {
    id: string;
    kind: 'note' | 'attachment' | 'unresolved';
    degree: number;
    radius: number;
    x: number;
    y: number;
    sx: number;
    sy: number;
    pinned: boolean;
    dimmed: boolean;
    labelled: boolean;
  }[];
  links: { source: string; target: string; lit: boolean }[];
}

/**
 * The graph, drawn on a canvas: the drawing is read through the probe the view
 * leaves on its canvas, and checked against the pixels themselves.
 */
export class Graph {
  constructor(
    private readonly ui: Ui,
    private readonly root: Locator = ui.view,
  ) {}

  get page() {
    return this.ui.page;
  }
  get view() {
    return this.root.locator('.graph-view');
  }
  get canvas() {
    return this.view.locator('canvas.graph-canvas');
  }
  get filter() {
    return this.view.getByRole('searchbox', { name: 'Filtrer les notes' });
  }
  option(name: string) {
    return this.view.getByRole('checkbox', { name });
  }

  async drawing(): Promise<Drawing> {
    return this.canvas.evaluate((el) => (el as HTMLCanvasElement & { graphProbe: () => Drawing }).graphProbe());
  }

  async ids() {
    return (await this.drawing()).nodes.map((n) => n.id).sort();
  }

  async node(id: string) {
    const node = (await this.drawing()).nodes.find((n) => n.id === id);
    expect(node, `point ${id}`).toBeDefined();
    return node!;
  }

  /** Waits for the layout to come to rest. */
  async settle() {
    await expect(this.canvas).toBeVisible();
    await expect
      .poll(
        async () => {
          const d = await this.drawing().catch(() => null);
          return d !== null && d.width > 0 && !d.moving;
        },
        { timeout: 15_000, intervals: [200] },
      )
      .toBe(true);
  }

  /** Page position of a point of the graph. */
  async at(id: string) {
    const box = (await this.canvas.boundingBox())!;
    const node = await this.node(id);
    return { x: box.x + node.sx, y: box.y + node.sy };
  }

  /** A place of the canvas far from every point and link, as an offset from its top left corner. */
  async emptySpot() {
    const d = await this.drawing();
    const byId = new Map(d.nodes.map((n) => [n.id, n]));
    const segment = (px: number, py: number, a: Drawing['nodes'][number], b: Drawing['nodes'][number]) => {
      const vx = b.sx - a.sx;
      const vy = b.sy - a.sy;
      const t = Math.max(0, Math.min(1, ((px - a.sx) * vx + (py - a.sy) * vy) / (vx * vx + vy * vy || 1)));
      return Math.hypot(px - a.sx - t * vx, py - a.sy - t * vy);
    };
    let best = { x: 0, y: 0, room: -1 };
    for (let x = 60; x <= d.width - 60; x += 20) {
      for (let y = 60; y <= d.height - 60; y += 20) {
        const room = Math.min(
          ...d.nodes.map((n) => Math.hypot(x - n.sx, y - n.sy) - n.radius * d.view.k),
          ...d.links.map((l) => segment(x, y, byId.get(l.source)!, byId.get(l.target)!)),
        );
        if (room > best.room) best = { x, y, room };
      }
    }
    return best;
  }

  /** Page position of a place on the canvas, from its top left corner. */
  async corner(dx: number, dy: number) {
    const box = (await this.canvas.boundingBox())!;
    return { x: box.x + dx, y: box.y + dy };
  }

  /** Colour of the canvas at a point of the canvas (CSS pixels): [r, g, b, alpha]. */
  async pixel(sx: number, sy: number): Promise<number[]> {
    return this.canvas.evaluate(
      (el: HTMLCanvasElement, { sx, sy }) => {
        const scale = el.width / el.getBoundingClientRect().width;
        return [...el.getContext('2d')!.getImageData(Math.round(sx * scale), Math.round(sy * scale), 1, 1).data];
      },
      { sx, sy },
    );
  }

  /** The most saturated pink-ish pixel around a point, if any. */
  async pinkAround(sx: number, sy: number, reach = 3) {
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        const [r, g, , a] = await this.pixel(sx + dx, sy + dy);
        if (a! > 100 && r! - g! > 80) return true;
      }
    }
    return false;
  }
}

/** The colour of a CSS colour as [r, g, b], through a canvas so any syntax works. */
export function rgbOf(ui: Ui, color: string): Promise<number[]> {
  return ui.page.evaluate((color) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, color);
}

/** A theme ink ("ink", "ink-3"…) as the page computes it. */
export function inkVar(ui: Ui, name: string): Promise<string> {
  return ui.page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim(), name);
}

/** WCAG contrast ratio of two [r, g, b] colours. */
export function contrast(a: number[], b: number[]) {
  const luminance = (c: number[]) => {
    const [r, g, bl] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** True when two colours are within a few steps of each other. */
export function near(a: number[], b: number[], tolerance = 12) {
  return a.slice(0, 3).every((v, i) => Math.abs(v - b[i]!) <= tolerance);
}
