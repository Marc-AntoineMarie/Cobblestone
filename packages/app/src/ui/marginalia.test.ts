import { describe, expect, it } from 'vitest';
import { contextSegments } from './Marginalia';

describe('backlink context', () => {
  it('shows link labels and marks the linking one', () => {
    const line = '- [ ] Open [[Links and backlinks]] and [[Welcome|home]] now';
    const at = line.indexOf('[[Welcome');
    expect(contextSegments(line, at)).toEqual([
      { text: 'Open Links and backlinks and ', hit: false },
      { text: 'home', hit: true },
      { text: ' now', hit: false },
    ]);
  });

  it('trims long lines around the hit', () => {
    const line = 'word '.repeat(40) + '[[Target]]' + ' tail'.repeat(40);
    const [before, hit, after] = contextSegments(line, line.indexOf('[['), 20);
    expect(before!.text.startsWith('…')).toBe(true);
    expect(hit).toEqual({ text: 'Target', hit: true });
    expect(after!.text.endsWith('…')).toBe(true);
  });
});
