import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@cobblestone/core';
import { anchor, bounds, dropSide, edgeEnds, facingSide, fitViewport, nodesInside, snap, toWorld, zoomAt } from './geometry';

const box = { x: 0, y: 0, width: 200, height: 100 };

describe('canvas geometry', () => {
  it('places anchors in the middle of each side', () => {
    expect(anchor(box, 'top')).toEqual({ x: 100, y: 0 });
    expect(anchor(box, 'right')).toEqual({ x: 200, y: 50 });
    expect(anchor(box, 'bottom')).toEqual({ x: 100, y: 100 });
    expect(anchor(box, 'left')).toEqual({ x: 0, y: 50 });
  });

  it('picks the side facing another node when an edge has none', () => {
    expect(facingSide(box, { x: 500, y: 60 })).toBe('right');
    expect(facingSide(box, { x: 100, y: -300 })).toBe('top');
    const ends = edgeEnds({ id: 'e', fromNode: 'a', toNode: 'b' }, box, { x: 400, y: 0, width: 100, height: 100 });
    expect([ends.fromSide, ends.toSide]).toEqual(['right', 'left']);
  });

  it('enters an arrow by the side it was dropped near, or facing its start when dropped in the middle', () => {
    const below = { x: -400, y: 300, width: 200, height: 100 };
    expect(dropSide(box, { x: 10, y: 50 }, below)).toBe('left');
    expect(dropSide(box, { x: 100, y: 95 }, below)).toBe('bottom');
    expect(dropSide(box, { x: 100, y: 50 }, below)).toBe('bottom');
    expect(dropSide(box, { x: 110, y: 45 }, { x: 600, y: 0, width: 200, height: 100 })).toBe('right');
  });

  it('fits content in the screen and zooms around the pointer', () => {
    const rect = bounds([box, { x: 400, y: 300, width: 100, height: 100 }])!;
    expect(rect).toEqual({ x: 0, y: 0, width: 500, height: 400 });
    const view = fitViewport(rect, 1000, 800);
    expect(view.zoom).toBe(1);
    expect(toWorld(view, { x: 500, y: 400 })).toEqual({ x: 250, y: 200 });
    const zoomed = zoomAt(view, { x: 500, y: 400 }, 2);
    expect(toWorld(zoomed, { x: 500, y: 400 })).toEqual({ x: 250, y: 200 });
  });

  it('snaps to the grid and finds nodes inside a group', () => {
    expect(snap(29)).toBe(20);
    expect(snap(31)).toBe(40);
    const group = { id: 'g', type: 'group', x: 0, y: 0, width: 500, height: 500 } as CanvasNode;
    const inside = { id: 'a', type: 'text', text: '', x: 10, y: 10, width: 100, height: 100 } as CanvasNode;
    const across = { id: 'b', type: 'text', text: '', x: 450, y: 10, width: 100, height: 100 } as CanvasNode;
    expect(nodesInside(group, [group, inside, across]).map((n) => n.id)).toEqual(['a']);
  });
});
