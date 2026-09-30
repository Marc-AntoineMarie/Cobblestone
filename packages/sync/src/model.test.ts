import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { applyTextDiff, conflictPath, hashBytes, kindOf, VaultDoc } from './model';

describe('kindOf', () => {
  it('merges notes and settings as text, and carries the rest as bytes', () => {
    expect(kindOf('Plan.md')).toBe('text');
    expect(kindOf('Tableau.canvas')).toBe('text');
    expect(kindOf('.cobblestone/app.JSON')).toBe('text');
    expect(kindOf('image.png')).toBe('binary');
    expect(kindOf('dossier.md/fichier')).toBe('binary');
  });
});

describe('conflictPath', () => {
  it('names the copy after the entry, before the extension', () => {
    expect(conflictPath('Notes/Plan.md', 'ab12cd34')).toBe('Notes/Plan (conflit ab12).md');
    expect(conflictPath('v1.0/LISEZMOI', 'ff00')).toBe('v1.0/LISEZMOI (conflit ff00)');
  });
});

describe('applyTextDiff', () => {
  it('keeps an edit made elsewhere in the same text', () => {
    const a = new Y.Doc();
    a.getText('t').insert(0, 'un deux trois');
    const b = new Y.Doc();
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    applyTextDiff(a.getText('t'), 'UN deux trois');
    applyTextDiff(b.getText('t'), 'un deux trois quatre');
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    expect(a.getText('t').toString()).toBe('UN deux trois quatre');
    expect(b.getText('t').toString()).toBe('UN deux trois quatre');
  });

  it('does nothing when the text is already there', () => {
    const doc = new Y.Doc();
    doc.getText('t').insert(0, 'même');
    expect(applyTextDiff(doc.getText('t'), 'même')).toBe(false);
  });
});

describe('VaultDoc.settleConflicts', () => {
  it('gives a conflict name to the larger id, and merges identical copies', () => {
    const model = new VaultDoc();
    model.add('Réunion.md', { text: 'A' }, 'aaaa1111');
    model.add('réunion.md', { text: 'B' }, 'bbbb2222');
    model.add('Plan.md', { text: 'pareil' }, 'cccc3333');
    model.add('Plan.md', { text: 'pareil' }, 'dddd4444');
    expect(model.settleConflicts()).toBe(true);
    expect(model.live().map((e) => e.path)).toEqual(['Réunion.md', 'réunion (conflit bbbb).md', 'Plan.md']);
    expect(model.entry('dddd4444')?.deleted).toBe(true);
    expect(model.settleConflicts()).toBe(false);
  });
});

describe('hashBytes', () => {
  it('gives the SHA-256 in hexadecimal', async () => {
    expect(await hashBytes(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('VaultDoc devices', () => {
  const device = (id: string, name: string) => ({ id, name, kind: 'desktop' as const, publicKey: `clé-${id}` });

  it('lists, renames and removes devices, and trusts only those still there', () => {
    const model = new VaultDoc();
    model.addDevice(device('a', 'PC portable'));
    model.addDevice(device('b', 'PC fixe'));
    model.renameDevice('b', 'Bureau');
    model.removeDevice('a');
    expect(model.deviceList()).toEqual([
      { ...device('a', 'PC portable'), removed: true },
      { ...device('b', 'Bureau'), removed: false },
    ]);
    expect(model.trusts('a', 'clé-a')).toBe(false);
    expect(model.trusts('b', 'clé-b')).toBe(true);
    expect(model.trusts('b', 'clé-a')).toBe(false);
    model.addDevice(device('a', 'PC portable'));
    expect(model.trusts('a', 'clé-a')).toBe(true);
  });

  it('keeps the first sync id it is given', () => {
    const model = new VaultDoc();
    expect(model.syncId).toBeUndefined();
    model.setSyncId('un');
    model.setSyncId('deux');
    expect(model.syncId).toBe('un');
  });
});
