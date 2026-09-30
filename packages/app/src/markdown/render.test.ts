import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render';

describe('renderMarkdown', () => {
  it('keeps the source of a Mermaid diagram safe from the sanitizer', () => {
    const html = renderMarkdown('```mermaid\ngraph TD\n  A --> B\n```');
    const source = /data-source="([^"]*)"/.exec(html)?.[1] ?? '';
    // The sanitizer drops attributes holding "-->": the source travels encoded.
    expect(source).not.toContain('-->');
    expect(decodeURIComponent(source)).toBe('graph TD\n  A --> B\n');
  });
});
