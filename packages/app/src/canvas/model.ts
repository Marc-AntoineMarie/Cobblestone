import { canvasId, type CanvasData, type CanvasEdge, type CanvasNode, type CanvasSide } from '@cobblestone/core';
import { nodesInside, snap } from './geometry';

/*
 * Pure editing operations on a canvas. Each returns a new CanvasData; the
 * view keeps them in an undo history and saves the latest one.
 */

export type NodePatch = Partial<Omit<CanvasNode, 'id' | 'type'>> & Record<string, unknown>;

/** Moves nodes (and whatever groups among them contain) by a delta, snapped to the grid. */
export function moveNodes(data: CanvasData, ids: Set<string>, dx: number, dy: number, grid = true): CanvasData {
  const moving = new Set(ids);
  for (const node of data.nodes) {
    if (node.type === 'group' && ids.has(node.id)) for (const child of nodesInside(node, data.nodes)) moving.add(child.id);
  }
  const round = grid ? snap : (v: number) => Math.round(v);
  return {
    ...data,
    nodes: data.nodes.map((n) => (moving.has(n.id) ? { ...n, x: round(n.x + dx), y: round(n.y + dy) } : n)),
  };
}

export function resizeNode(data: CanvasData, id: string, width: number, height: number): CanvasData {
  return updateNode(data, id, { width: Math.max(80, snap(width)), height: Math.max(40, snap(height)) });
}

export function updateNode(data: CanvasData, id: string, patch: NodePatch): CanvasData {
  return { ...data, nodes: data.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as CanvasNode) : n)) };
}

/** Adds a node; groups go under the other nodes, everything else on top. */
export function addNode(data: CanvasData, node: CanvasNode): CanvasData {
  const nodes = node.type === 'group' ? [node, ...data.nodes] : [...data.nodes, node];
  return { ...data, nodes };
}

export function newTextNode(x: number, y: number, text = ''): CanvasNode {
  return { id: canvasId(), type: 'text', text, x: snap(x), y: snap(y), width: 260, height: 140 };
}

export function newFileNode(x: number, y: number, file: string, isImage: boolean): CanvasNode {
  return { id: canvasId(), type: 'file', file, x: snap(x), y: snap(y), width: isImage ? 320 : 400, height: isImage ? 240 : 400 };
}

export function newGroupNode(x: number, y: number, width: number, height: number, label = ''): CanvasNode {
  return { id: canvasId(), type: 'group', label, x: snap(x), y: snap(y), width: snap(width), height: snap(height) };
}

/** Removes nodes and edges; edges attached to removed nodes go with them. */
export function removeItems(data: CanvasData, nodeIds: Set<string>, edgeIds: Set<string> = new Set()): CanvasData {
  return {
    ...data,
    nodes: data.nodes.filter((n) => !nodeIds.has(n.id)),
    edges: data.edges.filter((e) => !edgeIds.has(e.id) && !nodeIds.has(e.fromNode) && !nodeIds.has(e.toNode)),
  };
}

export function addEdge(
  data: CanvasData,
  fromNode: string,
  fromSide: CanvasSide,
  toNode: string,
  toSide: CanvasSide,
): CanvasData {
  if (fromNode === toNode) return data;
  const exists = data.edges.some(
    (e) => e.fromNode === fromNode && e.toNode === toNode && e.fromSide === fromSide && e.toSide === toSide,
  );
  if (exists) return data;
  const edge: CanvasEdge = { id: canvasId(), fromNode, fromSide, toNode, toSide, toEnd: 'arrow' };
  return { ...data, edges: [...data.edges, edge] };
}

export function updateEdge(data: CanvasData, id: string, patch: Partial<CanvasEdge>): CanvasData {
  return { ...data, edges: data.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
}

/** Sets (or clears, with null) the colour of nodes and edges. */
export function setColor(data: CanvasData, nodeIds: Set<string>, edgeIds: Set<string>, color: string | null): CanvasData {
  const apply = <T extends { color?: string }>(item: T): T => {
    if (color === null) {
      const { color: _removed, ...rest } = item;
      return rest as T;
    }
    return { ...item, color };
  };
  return {
    ...data,
    nodes: data.nodes.map((n) => (nodeIds.has(n.id) ? apply(n) : n)),
    edges: data.edges.map((e) => (edgeIds.has(e.id) ? apply(e) : e)),
  };
}

/** Copies nodes (and the edges between them) with new ids, offset so the copy is visible. */
export function duplicate(data: CanvasData, ids: Set<string>, offset = 40): { data: CanvasData; ids: Set<string> } {
  const map = new Map<string, string>();
  const copies = data.nodes
    .filter((n) => ids.has(n.id))
    .map((n) => {
      const id = canvasId();
      map.set(n.id, id);
      return { ...n, id, x: n.x + offset, y: n.y + offset } as CanvasNode;
    });
  const edges = data.edges
    .filter((e) => map.has(e.fromNode) && map.has(e.toNode))
    .map((e) => ({ ...e, id: canvasId(), fromNode: map.get(e.fromNode)!, toNode: map.get(e.toNode)! }));
  return { data: { ...data, nodes: [...data.nodes, ...copies], edges: [...data.edges, ...edges] }, ids: new Set(map.values()) };
}

/** Undo history of canvas states. */
export class History {
  private past: CanvasData[] = [];
  private future: CanvasData[] = [];

  constructor(private readonly limit = 100) {}

  push(previous: CanvasData) {
    this.past.push(previous);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current: CanvasData): CanvasData | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(current);
    return previous;
  }

  redo(current: CanvasData): CanvasData | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(current);
    return next;
  }
}

/** Preset colours of JSON Canvas ("1" red … "6" purple), printed with the matching inks. */
export const PRESET_COLORS: Record<string, string> = {
  '1': 'var(--red)',
  '2': 'var(--orange)',
  '3': 'var(--yellow)',
  '4': 'var(--green)',
  '5': 'var(--teal)',
  '6': 'var(--purple)',
};

export function colorValue(color: string | undefined): string | null {
  if (!color) return null;
  return PRESET_COLORS[color] ?? (/^#[0-9a-f]{3,8}$/i.test(color) ? color : null);
}
