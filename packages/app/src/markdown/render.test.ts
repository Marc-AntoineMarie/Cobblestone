import { describe, expect, it } from 'vitest';
import { renderMarkdown, stripFrontmatter } from './render';

describe('reading view renderer', () => {
  it('renders wikilinks, embeds and tags', () => {
    const html = renderMarkdown('See [[Note#Part|alias]] and [[Plain]] ![[img.png|200]] #tag/sub not#tag');
    expect(html).toContain('<a class="internal-link" data-href="Note#Part" href="#">alias</a>');
    expect(html).toContain('data-href="Plain" href="#">Plain</a>');
    expect(html).toContain('<span class="internal-embed" data-src="img.png" data-alt="200"></span>');
    expect(html).toContain('<a class="tag" data-tag="#tag/sub" href="#">#tag/sub</a>');
    expect(html).not.toContain('data-tag="#tag"');
  });

  it('renders highlights and hides comments', () => {
    const html = renderMarkdown('a ==marked **bold**== b %%hidden%% c\n\n%%\nblock comment\n%%\n\nafter');
    expect(html).toContain('<mark>marked <strong>bold</strong></mark>');
    expect(html).not.toContain('hidden');
    expect(html).not.toContain('block comment');
    expect(html).toContain('after');
  });

  it('renders math with KaTeX', () => {
    const html = renderMarkdown('Inline $x^2$ and costs $5 or $10.\n\n$$\n\\frac{a}{b}\n$$');
    expect(html).toContain('math-inline');
    expect(html).toContain('math-block');
    expect(html).toContain('costs $5 or $10');
  });

  it('renders callouts with fold state', () => {
    const html = renderMarkdown('> [!warning]- Careful\n> body text');
    expect(html).toContain('class="callout is-collapsible is-collapsed" data-callout="warning"');
    expect(html).toContain('<span class="callout-title-inner">Careful</span>');
    expect(html).toContain('body text');
    expect(html).not.toContain('[!warning]');
    expect(renderMarkdown('> [!tip]\n> x')).toContain('<span class="callout-title-inner">Tip</span>');
  });

  it('renders tasks with their source line', () => {
    const html = renderMarkdown('- [ ] todo\n- [x] done');
    expect(html).toContain('<input type="checkbox" class="task-list-item-checkbox" data-line="0">todo');
    expect(html).toContain('data-line="1" checked>done');
    expect(html).toContain('data-task="x"');
  });

  it('hides block ids and marks internal markdown links', () => {
    const html = renderMarkdown('A paragraph ^abc\n\n[doc](My%20Note.md) [web](https://example.org)');
    expect(html).toContain('id="^abc"');
    expect(html).not.toContain('^abc<');
    expect(html).toContain('data-href="My Note.md"');
    expect(html).toContain('class="external-link" target="_blank" rel="noopener noreferrer"');
  });

  it('strips frontmatter', () => {
    expect(stripFrontmatter('---\na: 1\n---\n# Title')).toEqual({ body: '# Title', offsetLines: 3 });
    expect(stripFrontmatter('# Title').body).toBe('# Title');
  });

  it('keeps the source of a Mermaid diagram safe from the sanitizer', () => {
    const html = renderMarkdown('```mermaid\ngraph TD\n  A --> B\n```');
    const source = /data-source="([^"]*)"/.exec(html)?.[1] ?? '';
    // The sanitizer drops attributes holding "-->": the source travels encoded.
    expect(source).not.toContain('-->');
    expect(decodeURIComponent(source)).toBe('graph TD\n  A --> B\n');
  });
});
