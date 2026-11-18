import { describe, expect, it } from 'vitest';
import { EditorState, type TransactionSpec } from '@codemirror/state';
import { MemoryAdapter, Vault } from '@cobblestone/core';
import { channelPair, VaultSync, type SyncStore } from '@cobblestone/sync';
import { LiveBinding, type LiveSource } from './collab';

/*
 * Two devices as the app runs them: a vault, its CRDT, and one editor on a
 * note — bound to the shared text, saving the file a moment after each
 * keystroke, like Editor.tsx.
 */

class MemoryStore implements SyncStore {
  state: Uint8Array | null = null;
  async load() {
    return this.state;
  }
  async save(state: Uint8Array) {
    this.state = state;
  }
}

/** An editor of one note, as the app wires it. */
class Editor {
  state: EditorState;
  binding: LiveBinding;
  pending: string | null = null;
  private readonly token = {};

  constructor(
    readonly device: Device,
    readonly path: string,
    text: string,
  ) {
    this.state = EditorState.create({ doc: text });
    const source: LiveSource = {
      text: () => device.sync.textAt(this.path),
      edit: (apply) => device.sync.change(apply, this.token),
      own: (origin) => origin === this.token,
      cursors: () => [],
      subscribe: () => () => {},
      publish: () => {},
      saving: (next) => {
        if (device.sync.textAt(this.path)) device.sync.expectWrite(this.path, next);
      },
      leave: () => {},
    };
    this.binding = new LiveBinding(source, this);
    device.vault.on('modify', (file, content) => {
      if (file.path !== this.path || content === null) return;
      if (this.pending !== null) return;
      if (this.binding.follow()) return;
      this.apply({ changes: { from: 0, to: this.state.doc.length, insert: content }, userEvent: 'external' });
    });
  }

  dispatch(spec: TransactionSpec) {
    this.apply(spec);
  }

  /** A transaction, as the view plugin sees it: the binding first, then the save. */
  private apply(spec: TransactionSpec) {
    const tr = this.state.update(spec);
    this.state = tr.state;
    this.binding.local(tr);
    if (!this.binding.text) this.binding.follow();
    if (tr.docChanged && !tr.isUserEvent('external')) this.pending = tr.state.doc.toString();
  }

  /** Types `insert` at `at`, replacing `remove` characters. */
  type(at: number, insert: string, remove = 0) {
    this.apply({ changes: { from: at, to: at + remove, insert } });
  }

  /** The debounced save of the app: the file takes what the editor holds. */
  async save() {
    const text = this.pending;
    if (text === null) return;
    this.pending = null;
    this.binding.follow();
    const source = this.binding as unknown as { source: LiveSource };
    source.source.saving(text);
    await this.device.vault.modify(this.path, text);
  }

  get text() {
    return this.state.doc.toString();
  }
}

interface Device {
  vault: Vault;
  sync: VaultSync;
}

async function device(files: Record<string, string> = {}) {
  const vault = new Vault(new MemoryAdapter('Coffre', files));
  await vault.load();
  const sync = new VaultSync(vault, new MemoryStore(), { saveDelay: 0 });
  await sync.start();
  return { vault, sync } satisfies Device;
}

function link(a: Device, b: Device) {
  const [left, right] = channelPair();
  a.sync.connect(left);
  b.sync.connect(right);
  return () => left.close();
}

async function settle(...devices: Device[]) {
  for (let round = 0; round < 6; round++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    for (const d of devices) await d.sync.settled();
  }
}

describe('two devices writing in the same note', () => {
  it('types on both sides, with the file saved, without doubling anything', async () => {
    const a = await device({ 'Note.md': 'début' });
    const b = await device();
    link(a, b);
    await settle(a, b);
    expect(await b.vault.read('Note.md')).toBe('début');

    const ea = new Editor(a, 'Note.md', 'début');
    const eb = new Editor(b, 'Note.md', 'début');
    expect(ea.binding.follow()).toBe(true);
    expect(eb.binding.follow()).toBe(true);

    ea.type(5, ' de A');
    await settle(a, b);
    await ea.save();
    await settle(a, b);
    expect(eb.text).toBe('début de A');

    eb.type(eb.text.length, ' puis B');
    await settle(a, b);
    await eb.save();
    await settle(a, b);

    expect(ea.text).toBe('début de A puis B');
    expect(eb.text).toBe('début de A puis B');
    expect(await a.vault.read('Note.md')).toBe('début de A puis B');
    expect(await b.vault.read('Note.md')).toBe('début de A puis B');
  });

  it('types on both sides at the same moment, each saving its own text', async () => {
    const a = await device({ 'Note.md': 'début' });
    const b = await device();
    link(a, b);
    await settle(a, b);
    const ea = new Editor(a, 'Note.md', 'début');
    const eb = new Editor(b, 'Note.md', 'début');
    ea.binding.follow();
    eb.binding.follow();

    ea.type(0, 'A: ');
    eb.type(5, ' (B)');
    await ea.save();
    await eb.save();
    await settle(a, b);

    expect(ea.text).toBe(eb.text);
    expect(await a.vault.read('Note.md')).toBe(ea.text);
    expect(await b.vault.read('Note.md')).toBe(eb.text);
    expect(ea.text).toContain('A: ');
    expect(ea.text).toContain(' (B)');
    expect(ea.text.match(/A: /g)).toHaveLength(1);
    expect(ea.text.match(/\(B\)/g)).toHaveLength(1);
  });

  it('keeps typing while the other device deletes, without bringing anything back', async () => {
    const a = await device({ 'Note.md': 'un deux trois' });
    const b = await device();
    link(a, b);
    await settle(a, b);
    const ea = new Editor(a, 'Note.md', 'un deux trois');
    const eb = new Editor(b, 'Note.md', 'un deux trois');
    ea.binding.follow();
    eb.binding.follow();

    // A deletes " deux", B types at the end, both save.
    ea.type(2, '', 5);
    eb.type(13, ' quatre');
    await ea.save();
    await eb.save();
    await settle(a, b);
    await ea.save();
    await eb.save();
    await settle(a, b);

    expect(ea.text).toBe(eb.text);
    expect(ea.text).not.toContain('deux');
    expect(ea.text).toContain('quatre');
    expect(await a.vault.read('Note.md')).toBe(ea.text);
    expect(await b.vault.read('Note.md')).toBe(eb.text);
  });

  it('keeps the note in one piece through a link that breaks and comes back', async () => {
    const a = await device({ 'Note.md': 'début' });
    const b = await device();
    let cut = link(a, b);
    await settle(a, b);
    const ea = new Editor(a, 'Note.md', 'début');
    const eb = new Editor(b, 'Note.md', 'début');
    ea.binding.follow();
    eb.binding.follow();

    ea.type(5, ' A1');
    await settle(a, b);
    cut();
    ea.type(ea.text.length, ' A2');
    eb.type(eb.text.length, ' B1');
    await ea.save();
    await eb.save();
    await settle(a, b);
    cut = link(a, b);
    await settle(a, b);
    await ea.save();
    await eb.save();
    await settle(a, b);

    expect(ea.text).toBe(eb.text);
    expect(await a.vault.read('Note.md')).toBe(ea.text);
    expect(await b.vault.read('Note.md')).toBe(eb.text);
    expect(ea.text.match(/A1/g)).toHaveLength(1);
    expect(ea.text.match(/A2/g)).toHaveLength(1);
    expect(ea.text.match(/B1/g)).toHaveLength(1);
  });

  it('types a whole sentence on both sides, keystroke by keystroke, saves between', async () => {
    const a = await device({ 'Note.md': '' });
    const b = await device();
    link(a, b);
    await settle(a, b);
    const ea = new Editor(a, 'Note.md', '');
    const eb = new Editor(b, 'Note.md', '');
    ea.binding.follow();
    eb.binding.follow();

    for (const letter of 'bonjour') {
      ea.type(ea.text.length, letter);
      await settle(a, b);
    }
    await ea.save();
    await settle(a, b);
    for (const letter of ' monde') {
      eb.type(eb.text.length, letter);
      await settle(a, b);
      await eb.save();
      await settle(a, b);
    }
    await settle(a, b);

    expect(ea.text).toBe('bonjour monde');
    expect(eb.text).toBe('bonjour monde');
    expect(await a.vault.read('Note.md')).toBe('bonjour monde');
    expect(await b.vault.read('Note.md')).toBe('bonjour monde');
  });
});
