import { Annotation, StateEffect, type ChangeSet, type ChangeSpec, type Extension } from '@codemirror/state';
import { Decoration, ViewPlugin, WidgetType, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import type * as Y from 'yjs';

/*
 * Writing together: once the vault syncs, the editor works on the note's
 * shared text. Each keystroke goes into it at once (and to the other devices);
 * what the others type comes in where they typed it. The file is still saved
 * as before. Other devices' cursors show at their names, in their ink.
 */

export interface RemoteCursor {
  device: string;
  name: string;
  /** Which of the inks (0–4) marks this device. */
  ink: number;
  anchor: number;
  head: number;
}

export interface LiveSource {
  /** The note's shared text, once the vault syncs and knows the note. */
  text(): Y.Text | null;
  /** Makes a change of this device on the shared text. */
  edit(apply: () => void): void;
  /** Whether a change of the shared text came from this device. */
  own(origin: unknown): boolean;
  cursors(): RemoteCursor[];
  /** Calls back when the other devices' cursors move. */
  subscribe(listener: () => void): () => void;
  /** Where this device's cursor is in the note. */
  publish(anchor: number, head: number): void;
  /** The editor saves this text, which the shared text already holds. */
  saving(text: string): void;
  /** The editor closes. */
  leave(): void;
}

const fromOthers = Annotation.define<boolean>();
const redraw = StateEffect.define<null>();

/** The edits of a CodeMirror transaction, made on the shared text. */
export function toShared(changes: ChangeSet, text: Y.Text) {
  let shift = 0;
  changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    const at = fromA + shift;
    const insert = inserted.toString();
    if (toA > fromA) text.delete(at, toA - fromA);
    if (insert) text.insert(at, insert);
    shift += insert.length - (toA - fromA);
  });
}

/** A change of the shared text (a Yjs delta), as CodeMirror changes. */
export function fromShared(delta: { insert?: unknown; delete?: number; retain?: number }[]): ChangeSpec[] {
  const changes: ChangeSpec[] = [];
  let pos = 0;
  for (const op of delta) {
    if (op.retain) pos += op.retain;
    else if (typeof op.insert === 'string') changes.push({ from: pos, insert: op.insert });
    else if (op.delete) {
      changes.push({ from: pos, to: pos + op.delete });
      pos += op.delete;
    }
  }
  return changes;
}

/** The smallest change turning `from` into `to`, so the cursor and undo history survive. */
function difference(from: string, to: string): ChangeSpec | null {
  if (from === to) return null;
  let start = 0;
  while (start < from.length && start < to.length && from[start] === to[start]) start++;
  let endA = from.length;
  let endB = to.length;
  while (endA > start && endB > start && from[endA - 1] === to[endB - 1]) {
    endA--;
    endB--;
  }
  return { from: start, to: endA, insert: to.slice(start, endB) };
}

class Caret extends WidgetType {
  constructor(
    readonly name: string,
    readonly ink: number,
  ) {
    super();
  }

  override eq(other: Caret) {
    return other.name === this.name && other.ink === this.ink;
  }

  toDOM() {
    const caret = document.createElement('span');
    caret.className = `cm-remote-caret is-ink-${this.ink}`;
    const name = document.createElement('span');
    name.className = 'cm-remote-name';
    name.textContent = this.name;
    caret.append(name);
    return caret;
  }

  override ignoreEvent() {
    return true;
  }
}

export function liveText(source: LiveSource): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      text: Y.Text | null = null;
      /** Typed here before the shared text was there: it wins when they meet. */
      edited = false;
      stop: (() => void)[] = [];
      timer: ReturnType<typeof setTimeout> | undefined;

      constructor(readonly view: EditorView) {
        this.stop.push(source.subscribe(() => queueMicrotask(() => this.view.dispatch({ effects: redraw.of(null) }))));
        queueMicrotask(() => this.bind());
      }

      bind() {
        if (this.text) return;
        const text = source.text();
        if (!text) return;
        this.text = text;
        const doc = this.view.state.doc.toString();
        if (this.edited) {
          const change = difference(text.toString(), doc) as { from: number; to: number; insert: string } | null;
          if (change)
            source.edit(() => {
              text.delete(change.from, change.to - change.from);
              text.insert(change.from, change.insert);
            });
        } else {
          const change = difference(doc, text.toString());
          if (change) this.view.dispatch({ changes: change, annotations: fromOthers.of(true) });
        }
        const observer = (event: Y.YTextEvent, transaction: Y.Transaction) => {
          if (source.own(transaction.origin)) return;
          this.view.dispatch({
            changes: fromShared(event.delta as { insert?: unknown; delete?: number; retain?: number }[]),
            annotations: fromOthers.of(true),
          });
        };
        text.observe(observer);
        this.stop.push(() => text.unobserve(observer));
      }

      update(update: ViewUpdate) {
        const text = this.text;
        for (const tr of update.transactions) {
          if (!tr.docChanged || tr.annotation(fromOthers)) continue;
          if (text) source.edit(() => toShared(tr.changes, text));
          else this.edited = true;
        }
        if (!text && update.docChanged) queueMicrotask(() => this.bind());
        if (update.docChanged || update.selectionSet || update.transactions.some((tr) => tr.effects.some((e) => e.is(redraw)))) {
          this.decorations = this.draw();
        }
        if (text && update.view.hasFocus && (update.selectionSet || update.docChanged || update.focusChanged)) this.publishSoon();
      }

      publishSoon() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          const { anchor, head } = this.view.state.selection.main;
          source.publish(anchor, head);
        }, 80);
      }

      draw(): DecorationSet {
        const length = this.view.state.doc.length;
        const marks = source.cursors().flatMap((cursor) => {
          const anchor = Math.min(cursor.anchor, length);
          const head = Math.min(cursor.head, length);
          const caret = Decoration.widget({ widget: new Caret(cursor.name, cursor.ink), side: 1 }).range(head);
          if (anchor === head) return [caret];
          const range = Decoration.mark({ class: `cm-remote-selection is-ink-${cursor.ink}` }).range(
            Math.min(anchor, head),
            Math.max(anchor, head),
          );
          return [range, caret];
        });
        return Decoration.set(marks, true);
      }

      destroy() {
        clearTimeout(this.timer);
        this.stop.forEach((stop) => stop());
        source.leave();
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}
