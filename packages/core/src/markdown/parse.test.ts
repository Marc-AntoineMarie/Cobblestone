import { describe, expect, it } from 'vitest';
import { parseMarkdown } from './parse';

const targets = (text: string) => parseMarkdown(text).links.map((l) => l.target);
const tags = (text: string) => parseMarkdown(text).tags.map((t) => t.tag);

describe('wikilinks', () => {
  it('parses target, subpath, alias and embeds', () => {
    const [a, b, c, d] = parseMarkdown('See [[Note]], [[Folder/Other#Part 1|the part]], ![[img.png|300]] and [[#Local]].').links;
    expect(a).toMatchObject({ kind: 'wiki', embed: false, target: 'Note', subpath: '', display: null, raw: '[[Note]]' });
    expect(b).toMatchObject({ target: 'Folder/Other', subpath: '#Part 1', display: 'the part' });
    expect(c).toMatchObject({ embed: true, target: 'img.png', display: '300' });
    expect(d).toMatchObject({ target: '', subpath: '#Local' });
  });

  it('records positions', () => {
    const text = 'line one\nsee [[Target]] here';
    const [link] = parseMarkdown(text).links;
    expect(link!.line).toBe(1);
    expect(text.slice(link!.from, link!.to)).toBe('[[Target]]');
  });

  it('accepts escaped pipes inside tables', () => {
    const [link] = parseMarkdown('| a | [[Note\\|Alias]] |\n|---|---|').links;
    expect(link).toMatchObject({ target: 'Note', display: 'Alias' });
  });

  it('parses block references', () => {
    expect(parseMarkdown('[[Note#^abc-1]]').links[0]).toMatchObject({ target: 'Note', subpath: '#^abc-1' });
  });

  it('ignores links in code, math and comments', () => {
    const text = [
      '`[[inline code]]`',
      '```',
      '[[fenced]]',
      '```',
      '~~~js',
      '[[tilde]]',
      '~~~',
      '$$',
      '[[math]]',
      '$$',
      '%% [[comment]] %%',
      '%%',
      '[[multi-line comment]]',
      '%%',
      '<!-- [[html comment]] -->',
      '\\[\\[escaped]]',
      '[[kept]]',
    ].join('\n');
    expect(targets(text)).toEqual(['kept']);
  });

  it('does not close a fence with a shorter one', () => {
    expect(targets('````\n```\n[[inside]]\n````\n[[after]]')).toEqual(['after']);
  });
});

describe('markdown links', () => {
  it('keeps internal links and decodes them', () => {
    const [a, b] = parseMarkdown(
      '[text](My%20Note.md#Sec) ![](<assets/a b.png>) [web](https://x.org) [mail](mailto:a@b.c)',
    ).links;
    expect(a).toMatchObject({ kind: 'markdown', target: 'My Note.md', subpath: '#Sec', display: 'text' });
    expect(b).toMatchObject({ embed: true, target: 'assets/a b.png', display: null });
    expect(parseMarkdown('[web](https://x.org)').links).toHaveLength(0);
  });
});

describe('tags', () => {
  it('finds tags and nested tags', () => {
    expect(tags('#one some #two/sub and #émoji-ok\n#start')).toEqual(['#one', '#two/sub', '#émoji-ok', '#start']);
  });

  it('rejects headings, numbers, anchors and code', () => {
    expect(tags('# Heading\n#1984 x#no http://a.b/#frag `#code` [[a|#alias]] \\#escaped #y1984')).toEqual(['#y1984']);
  });

  it('reads tags from properties', () => {
    const meta = parseMarkdown('---\ntags: [project, "#work"]\n---\nbody #inline #Project');
    expect(meta.tags.map((t) => t.tag)).toEqual(['#project', '#work', '#inline', '#Project']);
    expect(meta.allTags).toEqual(['#project', '#work', '#inline']);
  });

  it('accepts comma or space separated tag strings', () => {
    expect(tags('---\ntags: a, b c\n---')).toEqual(['#a', '#b', '#c']);
  });
});

describe('frontmatter', () => {
  it('parses properties, aliases and property links', () => {
    const meta = parseMarkdown(
      '---\ntitle: Hello\naliases:\n  - Hi\n  - Salut\nrelated: "[[Other#Top]]"\nlist: ["[[A]]", "[[B|b]]"]\n---\n# Body',
    );
    expect(meta.frontmatter?.data.title).toBe('Hello');
    expect(meta.frontmatter?.endLine).toBe(7);
    expect(meta.aliases).toEqual(['Hi', 'Salut']);
    expect(meta.frontmatterLinks.map((l) => [l.key, l.target, l.subpath, l.display])).toEqual([
      ['related', 'Other', '#Top', null],
      ['list.0', 'A', '', null],
      ['list.1', 'B', '', 'b'],
    ]);
    expect(meta.headings[0]).toMatchObject({ text: 'Body', line: 8 });
  });

  it('reports invalid YAML without throwing', () => {
    const meta = parseMarkdown('---\nkey: [unclosed\n---\ntext');
    expect(meta.frontmatter?.error).toBeTruthy();
    expect(meta.frontmatter?.data).toEqual({});
  });

  it('requires frontmatter at the very start', () => {
    expect(parseMarkdown('\n---\na: 1\n---').frontmatter).toBeNull();
  });
});

describe('headings', () => {
  it('parses ATX headings and strips closing hashes', () => {
    const meta = parseMarkdown('# One\n## Two ##\n####### seven\n#no\n   ### Three `#code`');
    expect(meta.headings.map((h) => [h.level, h.text])).toEqual([
      [1, 'One'],
      [2, 'Two'],
      [3, 'Three `#code`'],
    ]);
  });

  it('ignores headings in code blocks', () => {
    expect(parseMarkdown('```\n# not\n```\n# yes').headings.map((h) => h.text)).toEqual(['yes']);
  });
});

describe('lists and tasks', () => {
  it('builds the item tree with task status', () => {
    const meta = parseMarkdown('- [ ] todo\n  - [x] done child\n\t- [-] cancelled\n- plain\n1. first\n> - [/] quoted task');
    expect(meta.listItems.map((i) => [i.line, i.task, i.parent, i.text])).toEqual([
      [0, ' ', null, 'todo'],
      [1, 'x', 0, 'done child'],
      [2, '-', 1, 'cancelled'],
      [3, null, null, 'plain'],
      [4, null, null, 'first'],
      [5, '/', null, 'quoted task'],
    ]);
  });
});

describe('sections and blocks', () => {
  const text = [
    '# Title', //         0
    '', //                1
    'Para line one', //   2
    'line two ^para', //  3
    '', //                4
    '- item a ^itema', // 5
    '  - child', //       6
    '- item b', //        7
    '', //                8
    '> quote', //         9
    '', //               10
    '^quote', //         11
    '', //               12
    '> [!note] Title', //13
    '> body', //         14
    '', //               15
    '| a | b |', //      16
    '|---|---|', //      17
    '| 1 | 2 |', //      18
  ].join('\n');
  const meta = parseMarkdown(text);

  it('splits sections', () => {
    expect(meta.sections.map((s) => [s.type, s.startLine, s.endLine])).toEqual([
      ['heading', 0, 0],
      ['paragraph', 2, 3],
      ['list', 5, 7],
      ['blockquote', 9, 9],
      ['paragraph', 11, 11],
      ['callout', 13, 14],
      ['table', 16, 18],
    ]);
  });

  it('resolves block ids to their content', () => {
    expect(meta.blocks.para).toMatchObject({ startLine: 2, endLine: 3 });
    expect(meta.blocks.itema).toMatchObject({ startLine: 5, endLine: 6 });
    expect(meta.blocks.quote).toMatchObject({ line: 11, startLine: 9, endLine: 9 });
  });
});

describe('robustness', () => {
  it('handles CRLF line endings', () => {
    const meta = parseMarkdown('---\r\na: 1\r\n---\r\n# Head\r\n[[Link]] #tag\r\n');
    expect(meta.frontmatter?.data).toEqual({ a: 1 });
    expect(meta.headings[0]?.text).toBe('Head');
    expect(meta.links[0]?.target).toBe('Link');
    expect(meta.tags[0]?.tag).toBe('#tag');
  });

  it('handles an empty note', () => {
    expect(parseMarkdown('')).toMatchObject({ links: [], tags: [], headings: [], frontmatter: null });
  });

  it('does not treat prices as inline math', () => {
    expect(targets('costs $5 and [[Link]] costs $10')).toEqual(['Link']);
  });
});
