import { describe, expect, it } from 'vitest';
import { fold, fuzzyMatch, highlightSegments } from './fuzzy';

describe('fuzzy matching', () => {
  it('matches subsequences and ranks prefixes first', () => {
    const names = ['Project plan', 'Plan', 'Pancakes', 'Deep planning notes'];
    const ranked = names
      .map((n) => ({ n, m: fuzzyMatch('plan', n) }))
      .filter((x) => x.m)
      .sort((a, b) => b.m!.score - a.m!.score)
      .map((x) => x.n);
    expect(ranked[0]).toBe('Plan');
    expect(ranked).toContain('Project plan');
    expect(fuzzyMatch('xyz', 'Plan')).toBeNull();
  });

  it('ignores case and accents', () => {
    expect(fuzzyMatch('etude', 'Étude de cas')).not.toBeNull();
    expect(fold('Élève')).toBe('eleve');
  });

  it('builds highlight segments', () => {
    expect(highlightSegments('Plan', [0, 1])).toEqual([
      { text: 'Pl', hit: true },
      { text: 'an', hit: false },
    ]);
  });
});
