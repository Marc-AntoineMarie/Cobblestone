import { EditorSelection, type ChangeSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/** Wraps each selection in `marker` (e.g. "**"), or unwraps it when already wrapped. */
export function toggleWrap(view: EditorView, marker: string): boolean {
  const { state } = view;
  const changes = state.changeByRange((range) => {
    const before = state.doc.sliceString(range.from - marker.length, range.from);
    const after = state.doc.sliceString(range.to, range.to + marker.length);
    if (before === marker && after === marker) {
      return {
        changes: [
          { from: range.from - marker.length, to: range.from },
          { from: range.to, to: range.to + marker.length },
        ],
        range: EditorSelection.range(range.from - marker.length, range.to - marker.length),
      };
    }
    const text = state.doc.sliceString(range.from, range.to);
    if (text.startsWith(marker) && text.endsWith(marker) && text.length >= marker.length * 2) {
      return {
        changes: { from: range.from, to: range.to, insert: text.slice(marker.length, -marker.length) },
        range: EditorSelection.range(range.from, range.to - marker.length * 2),
      };
    }
    return {
      changes: [
        { from: range.from, insert: marker },
        { from: range.to, insert: marker },
      ],
      range: EditorSelection.range(range.from + marker.length, range.to + marker.length),
    };
  });
  view.dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input' }));
  return true;
}

/** Turns the selection into a wikilink, or inserts "[[]]" with the cursor inside. */
export function insertWikiLink(view: EditorView): boolean {
  const { state } = view;
  view.dispatch(
    state.changeByRange((range) => {
      const text = state.doc.sliceString(range.from, range.to);
      const insert = `[[${text}]]`;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: text ? EditorSelection.cursor(range.from + insert.length) : EditorSelection.cursor(range.from + 2),
      };
    }),
  );
  return true;
}

const LIST = /^(\s*)([-*+]|\d+[.)])(\s+)(\[(.)\]\s)?/;

/** Cycles a line: text → "- [ ] text" → "- [x] text" → "- [ ] text". */
export function toggleTask(view: EditorView): boolean {
  const { state } = view;
  const changes: ChangeSpec[] = [];
  const seen = new Set<number>();
  for (const range of state.selection.ranges) {
    for (let n = state.doc.lineAt(range.from).number; n <= state.doc.lineAt(range.to).number; n++) {
      if (seen.has(n)) continue;
      seen.add(n);
      const line = state.doc.line(n);
      const m = LIST.exec(line.text);
      if (!m) {
        const indent = /^\s*/.exec(line.text)![0].length;
        changes.push({ from: line.from + indent, insert: '- [ ] ' });
      } else if (!m[4]) {
        const at = line.from + m[1]!.length + m[2]!.length + m[3]!.length;
        changes.push({ from: at, insert: '[ ] ' });
      } else {
        const at = line.from + m[1]!.length + m[2]!.length + m[3]!.length + 1;
        changes.push({ from: at, to: at + 1, insert: m[5] === ' ' ? 'x' : ' ' });
      }
    }
  }
  view.dispatch({ changes, userEvent: 'input' });
  return true;
}
