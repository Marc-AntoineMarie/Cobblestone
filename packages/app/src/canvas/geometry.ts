import type { CanvasEdge, CanvasNode, CanvasSide } from '@cobblestone/core';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export const GRID = 20;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;

export const snap = (value: number) => Math.round(value / GRID) * GRID;

/** Middle of one side of a node, where edges attach. */
export function anchor(node: Rect, side: CanvasSide): Point {
  switch (side) {
    case 'top':
      return { x: node.x + node.width / 2, y: node.y };
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 };
    case 'right':
      return { x: node.x + node.width, y: node.y + node.height / 2 };
  }
}

const NORMAL: Record<CanvasSide, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** The side of `node` facing `toward`, for edges saved without sides. */
export function facingSide(node: Rect, toward: Point): CanvasSide {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const dx = (toward.x - cx) / Math.max(node.width, 1);
  const dy = (toward.y - cy) / Math.max(node.height, 1);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

/**
 * The side an arrow dropped at `point` enters: the side it was dropped near, or,
 * dropped in the middle of the card, the side facing the card it comes from.
 */
export function dropSide(node: Rect, point: Point, from: Rect): CanvasSide {
  const dx = (point.x - (node.x + node.width / 2)) / Math.max(node.width, 1);
  const dy = (point.y - (node.y + node.height / 2)) / Math.max(node.height, 1);
  if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) return facingSide(node, center(from));
  return facingSide(node, point);
}

export function center(node: Rect): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

/** Ends and sides of an edge, filling in the sides Obsidian may leave out. */
export function edgeEnds(edge: CanvasEdge, from: Rect, to: Rect) {
  const fromSide = edge.fromSide ?? facingSide(from, center(to));
  const toSide = edge.toSide ?? facingSide(to, center(from));
  return { fromSide, toSide, start: anchor(from, fromSide), end: anchor(to, toSide) };
}

/** A cubic curve leaving and entering perpendicular to the sides, like Obsidian's. */
export function edgePath(start: Point, fromSide: CanvasSide, end: Point, toSide: CanvasSide | null): string {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const pull = Math.min(Math.max(distance * 0.4, 40), 240);
  const a = NORMAL[fromSide];
  const b = toSide ? NORMAL[toSide] : { x: 0, y: 0 };
  const c1 = { x: start.x + a.x * pull, y: start.y + a.y * pull };
  const c2 = { x: end.x + b.x * pull, y: end.y + b.y * pull };
  return `M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;
}

/** Point halfway along the curve, for the edge label. */
export function edgeMidpoint(start: Point, fromSide: CanvasSide, end: Point, toSide: CanvasSide): Point {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const pull = Math.min(Math.max(distance * 0.4, 40), 240);
  const a = NORMAL[fromSide];
  const b = NORMAL[toSide];
  const p1 = { x: start.x + a.x * pull, y: start.y + a.y * pull };
  const p2 = { x: end.x + b.x * pull, y: end.y + b.y * pull };
  // Cubic Bézier at t = 0.5.
  return { x: (start.x + 3 * p1.x + 3 * p2.x + end.x) / 8, y: (start.y + 3 * p1.y + 3 * p2.y + end.y) / 8 };
}

/** Arrowhead triangle at `tip`, pointing into the side it enters. */
export function arrowHead(tip: Point, side: CanvasSide, size = 10): string {
  const n = NORMAL[side];
  // The arrow points against the side's outward normal.
  const back = { x: tip.x + n.x * size, y: tip.y + n.y * size };
  const perp = { x: -n.y * (size * 0.55), y: n.x * (size * 0.55) };
  return `${tip.x},${tip.y} ${back.x + perp.x},${back.y + perp.y} ${back.x - perp.x},${back.y - perp.y}`;
}

/** Smallest rectangle containing all nodes; null for an empty canvas. */
export function bounds(nodes: Rect[]): Rect | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Viewport showing `rect` centred in a screen of `width` × `height`, with a margin. */
export function fitViewport(rect: Rect | null, width: number, height: number, margin = 60): Viewport {
  if (!rect || width <= 0 || height <= 0) return { x: width / 2, y: height / 2, zoom: 1 };
  const zoom = Math.min(1, Math.max(MIN_ZOOM, Math.min((width - margin * 2) / rect.width, (height - margin * 2) / rect.height)));
  return {
    zoom,
    x: width / 2 - (rect.x + rect.width / 2) * zoom,
    y: height / 2 - (rect.y + rect.height / 2) * zoom,
  };
}

/** Zooms around a screen point so what is under the pointer stays under it. */
export function zoomAt(view: Viewport, screen: Point, factor: number): Viewport {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor));
  const k = zoom / view.zoom;
  return { zoom, x: screen.x - (screen.x - view.x) * k, y: screen.y - (screen.y - view.y) * k };
}

export function toWorld(view: Viewport, screen: Point): Point {
  return { x: (screen.x - view.x) / view.zoom, y: (screen.y - view.y) / view.zoom };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Nodes fully inside a group move with it. */
export function nodesInside(group: CanvasNode, nodes: CanvasNode[]): CanvasNode[] {
  return nodes.filter(
    (n) =>
      n.id !== group.id &&
      n.x >= group.x &&
      n.y >= group.y &&
      n.x + n.width <= group.x + group.width &&
      n.y + n.height <= group.y + group.height,
  );
}
