import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../markdown/parse';
import { parseQuery } from './query';
import { searchDocuments } from './search';

const notes: Record<string, string> = {
  'Projects/Alpha.md':
    '---\nstatus: active\nowner: [Alice, Bob]\n---\n# Plan\nShip the alpha release #work\n- [ ] write docs\n- [x] fix bug\n\n# Notes\nMeeting with Carol',
  'Projects/Beta.md': '---\nstatus: paused\n---\nBeta is on hold #work/later\n- [ ] restart beta',
  'Journal/2026-09-29.md': 'Went hiking. Alpha thoughts. #personal',
  'Recipes/Pancakes.md': 'Flour, eggs, milk. Case Sensitive Word',
};
const docs = Object.entries(notes).map(([path, content]) => ({ path, content, metadata: parseMarkdown(content) }));
const find = (q: string) =>
  searchDocuments(docs, q)
    .map((r) => r.path)
    .sort();

describe('query parser', () => {
  it('parses boolean structure', () => {
    expect(parseQuery('a b')).toMatchObject({ type: 'and', children: [{ type: 'term' }, { type: 'term' }] });
    expect(parseQuery('a OR b')).toMatchObject({ type: 'or' });
    expect(parseQuery('-a')).toMatchObject({ type: 'not' });
    expect(parseQuery('path:(x OR y)')).toMatchObject({ type: 'or', children: [{ field: 'path' }, { field: 'path' }] });
    expect(parseQuery('')).toBeNull();
  });

  it('keeps unknown prefixes as text', () => {
    expect(parseQuery('http://x')).toMatchObject({ type: 'term', matcher: { value: 'http://x' } });
  });
});

describe('search', () => {
  it('matches words anywhere (AND), in content or file name', () => {
    expect(find('alpha')).toEqual(['Journal/2026-09-29.md', 'Projects/Alpha.md']);
    expect(find('alpha release')).toEqual(['Projects/Alpha.md']);
    expect(find('pancakes')).toEqual(['Recipes/Pancakes.md']);
  });

  it('supports OR, negation, phrases and regex', () => {
    expect(find('hiking OR flour')).toEqual(['Journal/2026-09-29.md', 'Recipes/Pancakes.md']);
    expect(find('alpha -hiking')).toEqual(['Projects/Alpha.md']);
    expect(find('"alpha release"')).toEqual(['Projects/Alpha.md']);
    expect(find('"release alpha"')).toEqual([]);
    expect(find('/\\d{4}-\\d{2}/')).toEqual(['Journal/2026-09-29.md']);
  });

  it('supports field operators', () => {
    expect(find('path:Projects')).toEqual(['Projects/Alpha.md', 'Projects/Beta.md']);
    expect(find('file:beta')).toEqual(['Projects/Beta.md']);
    expect(find('content:alpha')).toEqual(['Journal/2026-09-29.md', 'Projects/Alpha.md']);
    expect(find('tag:work')).toEqual(['Projects/Alpha.md', 'Projects/Beta.md']);
    expect(find('tag:#work/later')).toEqual(['Projects/Beta.md']);
  });

  it('supports scopes', () => {
    expect(find('line:(alpha release)')).toEqual(['Projects/Alpha.md']);
    expect(find('line:(alpha carol)')).toEqual([]);
    expect(find('section:(meeting carol)')).toEqual(['Projects/Alpha.md']);
    expect(find('section:(ship carol)')).toEqual([]);
    expect(find('task-todo:docs')).toEqual(['Projects/Alpha.md']);
    expect(find('task-done:docs')).toEqual([]);
    expect(find('task:beta')).toEqual(['Projects/Beta.md']);
  });

  it('supports properties', () => {
    expect(find('[status]')).toEqual(['Projects/Alpha.md', 'Projects/Beta.md']);
    expect(find('[status:active]')).toEqual(['Projects/Alpha.md']);
    expect(find('[owner:bob]')).toEqual(['Projects/Alpha.md']);
  });

  it('supports case sensitivity', () => {
    expect(find('match-case:sensitive')).toEqual([]);
    expect(find('match-case:Sensitive')).toEqual(['Recipes/Pancakes.md']);
  });

  it('reports match positions for highlighting', () => {
    const [result] = searchDocuments(docs, 'meeting');
    const content = notes[result!.path]!;
    expect(result!.matches.map((m) => content.slice(m.from, m.to))).toEqual(['Meeting']);
    expect(result!.matches[0]!.line).toBe(content.split('\n').findIndex((l) => l.includes('Meeting')));
  });
});
