export interface FuzzyMatch {
  score: number;
  /** Indices of matched characters in the candidate, for highlighting. */
  indices: number[];
}

const WORD_START = /[\s\-_/.()[\]]/;

/**
 * Subsequence match with bonuses for consecutive characters, word starts
 * and prefix matches. Case- and accent-insensitive. Null when no match.
 */
export function fuzzyMatch(query: string, candidate: string): FuzzyMatch | null {
  const q = fold(query.trim());
  if (!q) return { score: 0, indices: [] };
  const c = fold(candidate);

  // Fast path: exact substring gets the best score and contiguous indices.
  const at = c.indexOf(q);
  if (at !== -1) {
    const startBonus = at === 0 ? 40 : WORD_START.test(c[at - 1] ?? ' ') ? 25 : 0;
    return {
      score: 100 + startBonus + q.length * 4 - Math.min(c.length - q.length, 40) * 0.5,
      indices: Array.from({ length: q.length }, (_, i) => at + i),
    };
  }

  const indices: number[] = [];
  let score = 0;
  let previous = -2;
  let ci = 0;
  for (const ch of q) {
    if (ch === ' ') continue;
    let found = -1;
    while (ci < c.length) {
      if (c[ci] === ch) {
        found = ci;
        ci++;
        break;
      }
      ci++;
    }
    if (found === -1) return null;
    indices.push(found);
    score += 1;
    if (found === previous + 1) score += 5;
    if (found === 0 || WORD_START.test(c[found - 1]!)) score += 8;
    previous = found;
  }
  score -= (indices[indices.length - 1]! - indices[0]!) * 0.2;
  score -= Math.min(c.length, 60) * 0.1;
  return { score, indices };
}

/** Lowercase without diacritics, keeping string length (one char per char). */
export function fold(text: string): string {
  let out = '';
  for (const ch of text.toLowerCase()) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += base.length === 1 ? base : ch;
  }
  return out;
}

/** Splits text into highlighted and plain segments. */
export function highlightSegments(text: string, indices: number[]): { text: string; hit: boolean }[] {
  if (!indices.length) return [{ text, hit: false }];
  const set = new Set(indices);
  const segments: { text: string; hit: boolean }[] = [];
  const chars = [...text];
  chars.forEach((ch, i) => {
    const hit = set.has(i);
    const last = segments[segments.length - 1];
    if (last && last.hit === hit) last.text += ch;
    else segments.push({ text: ch, hit });
  });
  return segments;
}
