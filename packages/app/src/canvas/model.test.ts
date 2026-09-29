import { describe, expect, it } from 'vitest';
import type { CanvasData } from '@cobblestone/core';
import { addEdge, colorValue, duplicate, History, moveNodes, removeItems, resizeNode, setColor } from './model';

const base = (): CanvasData => ({
  nodes: [
    { id: 'g', type: 'group', label: 'Group', x: 0, y: 0, width: 600, height: 400 },
    { id: 'a', type: 'text', text: 'A', x: 20, y: 20, width: 200, height: 100 },
    { id: 'b', type: 'text', text: 'B', x: 800, y: 0, width: 200, height: 100, color: '2' },
  ],
  edges: [{ id: 'e', fromNode: 'a', fromSide: 'right', toNode: 'b', toSide: 'left', toEnd: 'arrow' }],
});

describe('canvas editing', () => {
  it('moves a group with the nodes inside it, snapped to the grid', () => {
    const moved = moveNodes(base(), new Set(['g']), 103, 47);
    expect(moved.nodes.map((n) => [n.id, n.x, n.y])).toEqual([
      ['g', 100, 40],
      ['a', 120, 60],
      ['b', 800, 0],
    ]);
  });

  it('removes nodes with their edges', () => {
    const data = removeItems(base(), new Set(['a']));
    expect(data.nodes.map((n) => n.id)).toEqual(['g', 'b']);
    expect(data.edges).toEqual([]);
  });

  it('adds edges once and never to the same node', () => {
    let data = addEdge(base(), 'b', 'bottom', 'a', 'top');
    data = addEdge(data, 'b', 'bottom', 'a', 'top');
    data = addEdge(data, 'a', 'left', 'a', 'right');
    expect(data.edges).toHaveLength(2);
    expect(data.edges[1]).toMatchObject({ fromNode: 'b', toNode: 'a', toEnd: 'arrow' });
  });

  it('resizes with a minimum and sets or clears colours', () => {
    expect(resizeNode(base(), 'a', 10, 10).nodes[1]).toMatchObject({ width: 80, height: 40 });
    const coloured = setColor(base(), new Set(['a']), new Set(['e']), '4');
    expect(coloured.nodes[1]!.color).toBe('4');
    expect(coloured.edges[0]!.color).toBe('4');
    expect('color' in setColor(base(), new Set(['b']), new Set(), null).nodes[2]!).toBe(false);
    expect(colorValue('4')).toBe('var(--green)');
    expect(colorValue('#ff0000')).toBe('#ff0000');
    expect(colorValue('javascript:x')).toBeNull();
  });

  it('duplicates nodes with the edges between them', () => {
    const { data, ids } = duplicate(base(), new Set(['a', 'b']));
    expect(data.nodes).toHaveLength(5);
    expect(data.edges).toHaveLength(2);
    const [copyA] = data.nodes.filter((n) => ids.has(n.id) && n.type === 'text' && n.text === 'A');
    expect(copyA).toMatchObject({ x: 60, y: 60 });
  });

  it('undoes and redoes', () => {
    const history = new History();
    const first = base();
    const second = moveNodes(first, new Set(['b']), 20, 0);
    history.push(first);
    expect(history.undo(second)).toBe(first);
    expect(history.redo(first)).toBe(second);
    expect(history.redo(second)).toBeNull();
  });
});
