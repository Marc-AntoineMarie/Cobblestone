import { describe, expect, it } from 'vitest';
import { parser as baseParser, GFM } from '@lezer/markdown';
import { obsidianMarkdown } from './ofm-syntax';

const parser = baseParser.configure([GFM, ...obsidianMarkdown]);

/** Lists "Name:text" for every node of the given names. */
function nodes(doc: string, names: string[]): string[] {
  const out: string[] = [];
  parser.parse(doc).iterate({
    enter(node) {
      if (names.includes(node.name)) out.push(`${node.name}:${doc.slice(node.from, node.to)}`);
    },
  });
  return out;
}

describe('Obsidian syntax for the editor', () => {
  it('parses wikilinks, aliases and embeds', () => {
    expect(nodes('a [[Note#H|alias]] ![[img.png]] b', ['WikiLink', 'Embed', 'WikiLinkTarget', 'WikiLinkAlias'])).toEqual([
      'WikiLink:[[Note#H|alias]]',
      'WikiLinkTarget:Note#H',
      'WikiLinkAlias:alias',
      'Embed:![[img.png]]',
      'WikiLinkTarget:img.png',
    ]);
  });

  it('parses tags but not headings or numbers', () => {
    expect(nodes('# Title\n\ntext #tag #123 x#no #a/b/', ['Tag'])).toEqual(['Tag:#tag', 'Tag:#a/b']);
  });

  it('parses highlights with nested emphasis', () => {
    expect(nodes('==marked **bold**==', ['Highlight', 'StrongEmphasis'])).toEqual(['Highlight:==marked **bold**==', 'StrongEmphasis:**bold**']);
  });

  it('parses comments and math', () => {
    expect(nodes('a %%hidden%% $x^2$ costs $5\n\n%%\nblock\n%%\n\n$$\nE=mc^2\n$$', ['Comment', 'CommentBlock', 'InlineMath', 'MathBlock'])).toEqual([
      'Comment:%%hidden%%',
      'InlineMath:$x^2$',
      'CommentBlock:%%\nblock\n%%',
      'MathBlock:$$\nE=mc^2\n$$',
    ]);
  });

  it('parses block ids only at the end of a line', () => {
    expect(nodes('para ^abc\nnot ^here yet', ['BlockId'])).toEqual(['BlockId:^abc']);
  });

  it('parses closed frontmatter only', () => {
    expect(nodes('---\na: 1\n---\n# H', ['Frontmatter', 'ATXHeading1'])).toEqual(['Frontmatter:---\na: 1\n---', 'ATXHeading1:# H']);
    expect(nodes('---\nno closing', ['Frontmatter'])).toEqual([]);
  });

  it('keeps GFM tasks', () => {
    expect(nodes('- [ ] todo\n- [x] done', ['TaskMarker'])).toEqual(['TaskMarker:[ ]', 'TaskMarker:[x]']);
  });
});
