import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { cycleHeadingSpec, toggleBulletSpec } from './commands';

const apply = (doc: string, at: number, spec: (s: EditorState) => object, to = at) => {
  const state = EditorState.create({ doc, selection: EditorSelection.range(at, to) });
  return state.update(spec(state)).state.doc.toString();
};

describe('phone toolbar commands', () => {
  it('cycles a heading through three levels and back to text', () => {
    expect(apply('Title', 2, cycleHeadingSpec)).toBe('# Title');
    expect(apply('# Title', 4, cycleHeadingSpec)).toBe('## Title');
    expect(apply('## Title', 4, cycleHeadingSpec)).toBe('### Title');
    expect(apply('### Title', 5, cycleHeadingSpec)).toBe('Title');
  });

  it('puts a bullet on each selected line, or takes it off', () => {
    expect(apply('one\ntwo', 0, toggleBulletSpec, 5)).toBe('- one\n- two');
    expect(apply('  - one', 4, toggleBulletSpec)).toBe('  one');
    expect(apply('- [ ] task', 6, toggleBulletSpec)).toBe('- [ ] task');
  });
});
