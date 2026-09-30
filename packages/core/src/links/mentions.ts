import type { NoteMetadata } from '../markdown/types';

export interface Mention {
  from: number;
  to: number;
  line: number;
  /** The text as written ("project plan" for a note named "Project Plan"). */
  text: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Plain-text mentions of any of `names` (a note name and its aliases) in a
 * note: whole words, any case, outside links, code, comments and properties.
 */
export function findUnlinkedMentions(text: string, metadata: NoteMetadata | undefined, names: string[]): Mention[] {
  const words = [...new Set(names.map((n) => n.trim()).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
  if (!words.length) return [];
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${words.map(escape).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');

  // Ranges where a mention does not count.
  const skip: { from: number; to: number }[] = [...(metadata?.links ?? [])];
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  const lineRange = (a: number, b: number) => ({ from: lineStarts[a] ?? 0, to: (lineStarts[b + 1] ?? text.length + 1) - 1 });
  for (const section of metadata?.sections ?? []) {
    if (section.type === 'yaml' || section.type === 'code' || section.type === 'comment' || section.type === 'math') {
      skip.push(lineRange(section.startLine, section.endLine));
    }
  }
  // Inline code, comments, markdown links (to notes or to the web) and bare web addresses.
  for (const m of text.matchAll(/`[^`\n]+`|%%[\s\S]*?%%|!?\[[^\]\n]*\]\([^)\n]*\)|\b[a-z][a-z0-9+.-]*:\/\/[^\s)>\]]+/gi)) {
    skip.push({ from: m.index, to: m.index + m[0].length });
  }

  const lineOf = (pos: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid]! <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  const out: Mention[] = [];
  for (const m of text.matchAll(pattern)) {
    const from = m.index;
    const to = from + m[0].length;
    if (skip.some((r) => from < r.to && to > r.from)) continue;
    out.push({ from, to, line: lineOf(from), text: m[0] });
  }
  return out;
}
