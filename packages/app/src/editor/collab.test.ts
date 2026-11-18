import { describe, expect, it } from 'vitest';
import { EditorState, type TransactionSpec } from '@codemirror/state';
import * as Y from 'yjs';
import { fromShared, LiveBinding, toShared, type LiveSource } from './collab';

/** Two editors, each on its own copy of a shared text, exchanging updates. */
function pair(initial: string) {
  const a = new Y.Doc();
  a.getText('t').insert(0, initial);
  const b = new Y.Doc();
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
  let docs = [EditorState.create({ doc: initial }), EditorState.create({ doc: initial })];
  const texts = [a.getText('t'), b.getText('t')];
  texts.forEach((text, i) =>
    text.observe((event, tr) => {
      if (tr.local) return;
      docs[i] = docs[i]!.update({ changes: fromShared(event.delta as never) }).state;
    }),
  );
  const type = (i: number, at: number, insert: string, remove = 0) => {
    const tr = docs[i]!.update({ changes: { from: at, to: at + remove, insert } });
    docs[i] = tr.state;
    texts[i]!.doc!.transact(() => toShared(tr.changes, texts[i]!));
  };
  const exchange = () => {
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)), 'peer');
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)), 'peer');
  };
  return { docs: () => docs.map((d) => d.doc.toString()), texts, type, exchange };
}

describe('writing together', () => {
  it('keeps what both type at the same moment, everywhere the same', () => {
    const p = pair('Réunion\n\nfin');
    p.type(0, 0, 'Ordre : ');
    p.type(1, 12, ' du jour');
    p.type(1, 7, 'X', 0);
    p.type(0, 8, '', 1);
    p.exchange();
    const [a, b] = p.docs();
    expect(a).toBe(b);
    expect(a).toBe(p.texts[0]!.toString());
    expect(a).toContain('Ordre : ');
    expect(a).toContain(' du jour');
  });

  it('turns several changes of one transaction into the same text', () => {
    const doc = new Y.Doc();
    const text = doc.getText('t');
    text.insert(0, 'abcdef');
    const state = EditorState.create({ doc: 'abcdef' });
    const tr = state.update({
      changes: [
        { from: 1, to: 2 },
        { from: 3, insert: 'XY' },
        { from: 5, to: 6, insert: 'Z' },
      ],
    });
    toShared(tr.changes, text);
    expect(text.toString()).toBe(tr.state.doc.toString());
  });

  it('keeps two editors of one note on the same device in step, without typing twice', () => {
    const doc = new Y.Doc();
    const text = doc.getText('t');
    text.insert(0, 'bonjour');
    // Each editor writes under its own name and hears every change but its own.
    const writers = [{}, {}];
    let docs = [EditorState.create({ doc: 'bonjour' }), EditorState.create({ doc: 'bonjour' })];
    writers.forEach((writer, i) =>
      text.observe((event, tr) => {
        if (tr.origin === writer) return;
        docs[i] = docs[i]!.update({ changes: fromShared(event.delta as never) }).state;
      }),
    );
    const type = (i: number, at: number, insert: string, remove = 0) => {
      const tr = docs[i]!.update({ changes: { from: at, to: at + remove, insert } });
      docs[i] = tr.state;
      doc.transact(() => toShared(tr.changes, text), writers[i]);
    };
    type(0, 7, ' à tous');
    type(1, 0, 'Oh, ');
    type(0, 0, '', 4);
    expect(text.toString()).toBe('bonjour à tous');
    expect(docs.map((d) => d.doc.toString())).toEqual(['bonjour à tous', 'bonjour à tous']);
  });
});

/** An editor as the binding sees it, and the device's shared text, which can appear or change. */
function bound(initial: string) {
  const doc = new Y.Doc();
  const token = {};
  let current: Y.Text | null = null;
  const source = {
    text: () => current,
    edit: (apply: () => void) => doc.transact(apply, token),
    own: (origin: unknown) => origin === token,
  } as LiveSource;
  const view = {
    state: EditorState.create({ doc: initial }),
    dispatch(spec: TransactionSpec) {
      const tr = this.state.update(spec);
      this.state = tr.state;
      binding.local(tr);
    },
  };
  const binding = new LiveBinding(source, view);
  const shared = (name: string, text: string) => {
    const t = doc.getText(name);
    t.insert(0, text);
    return t;
  };
  return {
    view,
    binding,
    shared,
    use: (text: Y.Text | null) => (current = text),
    type: (at: number, insert: string, remove = 0) => view.dispatch({ changes: { from: at, to: at + remove, insert } }),
    /** Another device's change, as it reaches this one. */
    remote: (text: Y.Text, apply: (t: Y.Text) => void) => doc.transact(() => apply(text), 'peer'),
    external: (text: string) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, userEvent: 'external' }),
  };
}

describe('an editor on the shared text', () => {
  it('opened before the note had its shared text, follows it once there, without undoing what others wrote', () => {
    const e = bound('Une idée');
    expect(e.binding.follow()).toBe(false);
    // Another device's change reaches the file first, then the shared text exists.
    e.external('Une idée. Reçue.');
    const text = e.shared('a', 'Une idée. Reçue. Et encore.');
    e.use(text);
    expect(e.binding.follow()).toBe(true);
    expect(e.view.state.doc.toString()).toBe('Une idée. Reçue. Et encore.');
    e.type(e.view.state.doc.length, ' Répondu.');
    expect(text.toString()).toBe('Une idée. Reçue. Et encore. Répondu.');
  });

  it('keeps what was typed before the shared text was there', () => {
    const e = bound('Brouillon');
    e.type(9, ' tapé');
    e.use(e.shared('a', 'Brouillon'));
    e.binding.follow();
    expect(e.binding.text!.toString()).toBe('Brouillon tapé');
  });

  it('moves to the note’s new shared text, and leaves the former one alone', () => {
    const e = bound('Liste');
    const former = e.shared('a', 'Liste');
    e.use(former);
    e.binding.follow();
    const now = e.shared('b', 'Liste');
    e.use(now);
    e.remote(now, (t) => t.insert(5, ' de courses'));
    expect(e.view.state.doc.toString()).toBe('Liste');
    e.binding.follow();
    expect(e.view.state.doc.toString()).toBe('Liste de courses');
    e.type(0, '', 1);
    expect(now.toString()).toBe('iste de courses');
    expect(former.toString()).toBe('Liste');
    e.remote(former, (t) => t.insert(0, 'X'));
    expect(e.view.state.doc.toString()).toBe('iste de courses');
  });

  it('shows what others type, as they type it', () => {
    const e = bound('abc');
    const text = e.shared('a', 'abc');
    e.use(text);
    e.binding.follow();
    e.remote(text, (t) => t.delete(1, 1));
    expect(e.view.state.doc.toString()).toBe('ac');
  });
});
