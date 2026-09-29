import { isInside } from './path';

/*
 * JSON Canvas 1.0 (https://jsoncanvas.org), the format of Obsidian's .canvas
 * files. Unknown fields are kept as they are so files round-trip untouched.
 */

export type CanvasSide = 'top' | 'right' | 'bottom' | 'left';
export type CanvasEnd = 'none' | 'arrow';
/** A preset ("1" red … "6" purple) or a hex colour. */
export type CanvasColor = string;

interface NodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasColor;
  [extra: string]: unknown;
}

export type CanvasNode =
  | (NodeBase & { type: 'text'; text: string })
  | (NodeBase & { type: 'file'; file: string; subpath?: string })
  | (NodeBase & { type: 'link'; url: string })
  | (NodeBase & { type: 'group'; label?: string; background?: string; backgroundStyle?: 'cover' | 'ratio' | 'repeat' });

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: CanvasSide;
  fromEnd?: CanvasEnd;
  toNode: string;
  toSide?: CanvasSide;
  toEnd?: CanvasEnd;
  color?: CanvasColor;
  label?: string;
  [extra: string]: unknown;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  [extra: string]: unknown;
}

const NODE_TYPES = new Set(['text', 'file', 'link', 'group']);

/** Parses a canvas file; malformed entries are dropped, an empty or broken file gives an empty canvas. */
export function parseCanvas(text: string): CanvasData {
  let raw: unknown;
  try {
    raw = text.trim() ? JSON.parse(text) : {};
  } catch {
    return { nodes: [], edges: [] };
  }
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const nodes: CanvasNode[] = [];
  for (const item of Array.isArray(data.nodes) ? data.nodes : []) {
    if (!item || typeof item !== 'object') continue;
    const n = item as Record<string, unknown>;
    if (typeof n.id !== 'string' || !NODE_TYPES.has(n.type as string)) continue;
    const node = {
      ...n,
      x: num(n.x, 0),
      y: num(n.y, 0),
      width: Math.max(1, num(n.width, 250)),
      height: Math.max(1, num(n.height, 60)),
    } as CanvasNode;
    if (node.type === 'text' && typeof node.text !== 'string') node.text = '';
    if (node.type === 'file' && typeof node.file !== 'string') continue;
    if (node.type === 'link' && typeof node.url !== 'string') continue;
    nodes.push(node);
  }
  const ids = new Set(nodes.map((n) => n.id));
  const edges: CanvasEdge[] = [];
  for (const item of Array.isArray(data.edges) ? data.edges : []) {
    if (!item || typeof item !== 'object') continue;
    const e = item as CanvasEdge;
    if (typeof e.id !== 'string' || !ids.has(e.fromNode) || !ids.has(e.toNode)) continue;
    edges.push(e);
  }
  return { ...data, nodes, edges };
}

/** Serialises like Obsidian (tab indentation), so saving an unchanged canvas changes nothing. */
export function serializeCanvas(data: CanvasData): string {
  return JSON.stringify(data, null, '\t');
}

/** Paths of the files a canvas shows (file nodes and group backgrounds). */
export function canvasReferences(data: CanvasData): string[] {
  const out: string[] = [];
  for (const node of data.nodes) {
    if (node.type === 'file') out.push(node.file);
    if (node.type === 'group' && typeof node.background === 'string') out.push(node.background);
  }
  return out;
}

/**
 * Points file nodes and group backgrounds at renamed files; `mapping` maps
 * old paths (files or folders) to new ones. Returns null when nothing changed.
 */
export function renameCanvasReferences(data: CanvasData, mapping: Map<string, string>): CanvasData | null {
  const follow = (path: string): string => {
    for (const [from, to] of mapping) if (isInside(path, from)) return to + path.slice(from.length);
    return path;
  };
  let changed = false;
  const nodes = data.nodes.map((node) => {
    if (node.type === 'file') {
      const file = follow(node.file);
      if (file !== node.file) {
        changed = true;
        return { ...node, file };
      }
    }
    if (node.type === 'group' && typeof node.background === 'string') {
      const background = follow(node.background);
      if (background !== node.background) {
        changed = true;
        return { ...node, background };
      }
    }
    return node;
  });
  return changed ? { ...data, nodes } : null;
}

/** A 16-hex-digit id, like the ones Obsidian writes. */
export function canvasId(): string {
  let id = '';
  for (let i = 0; i < 16; i++) id += Math.floor(Math.random() * 16).toString(16);
  return id;
}
