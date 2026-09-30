import { describe, expect, it } from 'vitest';
import { MemoryAdapter } from '@cobblestone/core';
import { applySnippets, findSnippets, obsidianEnabledSnippets } from './snippets';

/** Just enough of a document for style elements. */
function fakeDocument() {
  const styles: { id: string; dataset: Record<string, string>; textContent: string; remove: () => void }[] = [];
  const head = {
    querySelectorAll: () => [...styles],
    append: (el: (typeof styles)[number]) => styles.push(el),
  };
  const createElement = () => {
    const el = {
      id: '',
      dataset: {} as Record<string, string>,
      textContent: '',
      remove: () => styles.splice(styles.indexOf(el), 1),
    };
    return el;
  };
  return { doc: { head, createElement } as unknown as Document, styles };
}

describe('CSS snippets', () => {
  it('finds Cobblestone’s and Obsidian’s snippets, and nothing else', async () => {
    const adapter = new MemoryAdapter('v', {
      '.cobblestone/snippets/wide.css': 'body{}',
      '.cobblestone/snippets/notes.txt': 'x',
      '.obsidian/snippets/Tables.css': 'table{}',
      '.obsidian/snippets/deeper/other.css': 'x',
      'Note.md': '',
      'style.css': 'x',
    });
    expect(await findSnippets(adapter)).toEqual([
      { path: '.cobblestone/snippets/wide.css', name: 'wide', source: 'cobblestone' },
      { path: '.obsidian/snippets/Tables.css', name: 'Tables', source: 'obsidian' },
    ]);
    expect(await findSnippets(new MemoryAdapter('v', { 'Note.md': '' }))).toEqual([]);
  });

  it('reads which snippets Obsidian turned on', () => {
    expect(obsidianEnabledSnippets({ enabledCssSnippets: ['Tables', 'a/b', 3] })).toEqual(['.obsidian/snippets/Tables.css']);
    expect(obsidianEnabledSnippets(null)).toEqual([]);
  });

  it('puts the enabled snippets in the page, in order, and takes out the others', async () => {
    const adapter = new MemoryAdapter('v', { '.cobblestone/snippets/a.css': 'a{}', '.cobblestone/snippets/b.css': 'b{}' });
    const { doc, styles } = fakeDocument();
    await applySnippets(adapter, ['.cobblestone/snippets/b.css', '.cobblestone/snippets/a.css'], doc);
    expect(styles.map((s) => s.textContent)).toEqual(['b{}', 'a{}']);
    const failed = await applySnippets(adapter, ['.cobblestone/snippets/a.css', '.cobblestone/snippets/gone.css'], doc);
    expect(styles.map((s) => s.textContent)).toEqual(['a{}']);
    expect(failed).toEqual(['.cobblestone/snippets/gone.css']);
  });
});
