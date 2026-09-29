import { describe, expect, it } from 'vitest';
import { MemoryAdapter } from './adapters/memory';
import { canvasReferences, parseCanvas, renameCanvasReferences, serializeCanvas } from './canvas';
import { Vault } from './vault';

const obsidianCanvas = serializeCanvas({
  nodes: [
    { id: 'g1', type: 'group', label: 'Ideas', x: -20, y: -20, width: 600, height: 400, background: 'img/bg.png' },
    { id: 'a', type: 'text', text: '# Hello', x: 0, y: 0, width: 250, height: 60, color: '4' },
    { id: 'b', type: 'file', file: 'Notes/Plan.md', subpath: '#Goals', x: 300, y: 0, width: 400, height: 300 },
    { id: 'c', type: 'link', url: 'https://jsoncanvas.org', x: 0, y: 200, width: 300, height: 200, pluginData: { keep: true } },
  ],
  edges: [{ id: 'e', fromNode: 'a', fromSide: 'right', toNode: 'b', toSide: 'left', toEnd: 'arrow', label: 'goal' }],
});

describe('JSON Canvas', () => {
  it('round-trips an Obsidian canvas exactly', () => {
    expect(serializeCanvas(parseCanvas(obsidianCanvas))).toBe(obsidianCanvas);
    expect(obsidianCanvas).toContain('\n\t"nodes"');
  });

  it('drops malformed entries and dangling edges', () => {
    const data = parseCanvas(
      JSON.stringify({
        nodes: [{ id: 'x', type: 'text', x: 'bad' }, { type: 'text' }, { id: 'y', type: 'mystery' }, { id: 'f', type: 'file' }],
        edges: [{ id: 'e', fromNode: 'x', toNode: 'gone' }],
      }),
    );
    expect(data.nodes).toEqual([{ id: 'x', type: 'text', text: '', x: 0, y: 0, width: 250, height: 60 }]);
    expect(data.edges).toEqual([]);
    expect(parseCanvas('not json')).toEqual({ nodes: [], edges: [] });
  });

  it('lists and renames the files a canvas shows', () => {
    const data = parseCanvas(obsidianCanvas);
    expect(canvasReferences(data)).toEqual(['img/bg.png', 'Notes/Plan.md']);
    const renamed = renameCanvasReferences(data, new Map([['Notes', 'Archive/Notes']]))!;
    expect(canvasReferences(renamed)).toEqual(['img/bg.png', 'Archive/Notes/Plan.md']);
    expect(renameCanvasReferences(data, new Map([['Other.md', 'X.md']]))).toBeNull();
  });

  it('follows renames in the vault', async () => {
    const vault = new Vault(new MemoryAdapter('v', { 'Notes/Plan.md': '# Plan', 'Board.canvas': obsidianCanvas }));
    await vault.load();
    await vault.rename('Notes/Plan.md', 'Notes/Roadmap.md');
    const board = parseCanvas(await vault.read('Board.canvas'));
    expect(canvasReferences(board)).toContain('Notes/Roadmap.md');
  });
});
