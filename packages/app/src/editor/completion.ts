import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import { dirname } from '@cobblestone/core';
import { fuzzyMatch } from '../ui/fuzzy';
import { editorHost } from './host';

/** Inserts `text` and steps over a "]]" that closeBrackets may already have added. */
function applyLink(text: string) {
  return (view: EditorView, _completion: Completion, from: number, to: number) => {
    const after = view.state.doc.sliceString(to, to + 2);
    const closing = after === ']]' ? '' : ']]';
    const insert = text + closing;
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length + (closing ? 0 : 2) },
    });
  };
}

/** Options matching `query`, best first; all of them, in their own order, when it is empty. */
function inOrder<T extends Completion>(options: T[], query: string, text: (option: T) => string): T[] {
  if (!query.trim()) return options;
  return options
    .map((option) => ({ option, match: fuzzyMatch(query, text(option)) }))
    .filter((x) => x.match)
    .sort((a, b) => b.match!.score - a.match!.score)
    .map((x) => x.option);
}

export function linkCompletion(context: CompletionContext): CompletionResult | null {
  const host = context.state.facet(editorHost);
  if (!host) return null;

  const link = context.matchBefore(/!?\[\[[^[\]\n|]*$/);
  if (link) {
    const embed = link.text.startsWith('!');
    const start = link.from + (embed ? 3 : 2);
    const query = link.text.slice(embed ? 3 : 2);
    const hash = query.indexOf('#');

    if (hash !== -1) {
      const notePart = query.slice(0, hash);
      const path = notePart ? host.resolve(notePart) : host.sourcePath();
      if (!path) return null;
      const rest = query.slice(hash + 1);
      const from = start + hash + 1;
      if (rest.startsWith('^')) {
        const blocks = host.blockIds(path).map((b) => ({ label: b.id, detail: b.text.slice(0, 60), apply: applyLink(b.id) }));
        return { from: from + 1, options: inOrder(blocks, rest.slice(1), (b) => `${b.label} ${b.detail}`), filter: false };
      }
      // Headings keep the note's order while nothing is typed.
      const headings = host.headings(path).map((h) => ({ label: h.text, detail: '#'.repeat(h.level), apply: applyLink(h.text) }));
      return { from, options: inOrder(headings, rest, (h) => h.label), filter: false };
    }

    // Our own matching, like the sidebar's: approximate, and blind to case and accents ("reun" finds "Réunion").
    const scored: { option: Completion; score: number }[] = [];
    const consider = (label: string, option: Completion, penalty = 0) => {
      const match = fuzzyMatch(query, label);
      if (match) scored.push({ option: { ...option, label }, score: match.score - penalty });
    };
    for (const candidate of host.linkCandidates()) {
      const text = host.linkText(candidate.path);
      const folder = dirname(candidate.path);
      consider(candidate.name, { label: '', detail: folder || undefined, apply: applyLink(text), type: 'note' });
      for (const alias of candidate.aliases) {
        consider(alias, { label: '', detail: `→ ${candidate.name}`, apply: applyLink(`${text}|${alias}`), type: 'alias' }, 1);
      }
    }
    scored.sort((a, b) => b.score - a.score || a.option.label.localeCompare(b.option.label));
    return { from: start, options: scored.slice(0, 200).map((s) => s.option), filter: false };
  }

  const tag = context.matchBefore(/(?:^|[\s(])#[\p{L}\p{N}_\-/]*$/u);
  if (tag && (tag.text.length > 1 || context.explicit)) {
    const hashAt = tag.from + tag.text.indexOf('#');
    if (tag.text.endsWith('#') && !context.explicit) {
      // "# " is a heading: wait for a character after the hash.
      return null;
    }
    return {
      from: hashAt,
      options: host.tags().map((name) => ({ label: name, type: 'tag' })),
      validFor: /^#[\p{L}\p{N}_\-/]*$/u,
    };
  }
  return null;
}
