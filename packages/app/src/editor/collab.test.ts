import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import * as Y from 'yjs';
import { fromShared, toShared } from './collab';

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
});
