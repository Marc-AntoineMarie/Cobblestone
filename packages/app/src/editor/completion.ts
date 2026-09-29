import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import { dirname } from '@cobblestone/core';
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
        return {
          from: from + 1,
          options: host.blockIds(path).map((b) => ({ label: b.id, detail: b.text.slice(0, 60), apply: applyLink(b.id) })),
          validFor: /^[A-Za-z0-9-]*$/,
        };
      }
      return {
        from,
        options: host.headings(path).map((h) => ({
          label: h.text,
          detail: '#'.repeat(h.level),
          apply: applyLink(h.text),
        })),
        validFor: /^[^[\]\n#|]*$/,
      };
    }

    const options: Completion[] = [];
    for (const candidate of host.linkCandidates()) {
      const text = host.linkText(candidate.path);
      const folder = dirname(candidate.path);
      options.push({ label: candidate.name, detail: folder || undefined, apply: applyLink(text), type: 'note' });
      for (const alias of candidate.aliases) {
        options.push({
          label: alias,
          detail: `→ ${candidate.name}`,
          apply: applyLink(`${text}|${alias}`),
          type: 'alias',
          boost: -1,
        });
      }
    }
    return { from: start, options, validFor: /^[^[\]\n#|]*$/ };
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
