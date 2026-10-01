import { describe, expect, it } from 'vitest';
import { MemoryAdapter, Vault } from '@cobblestone/core';
import { channelPair } from './protocol';
import { VaultSync, type SyncStore } from './vault-sync';

/** A store kept in memory, surviving the restart of a device. */
class MemoryStore implements SyncStore {
  state: Uint8Array | null = null;
  async load() {
    return this.state;
  }
  async save(state: Uint8Array) {
    this.state = state;
  }
}

let count = 0;

interface Device {
  adapter: MemoryAdapter;
  vault: Vault;
  sync: VaultSync;
  store: MemoryStore;
}

async function device(files: Record<string, string | Uint8Array> = {}, store = new MemoryStore(), adapter?: MemoryAdapter) {
  const disk = adapter ?? new MemoryAdapter(`Coffre${++count}`, files);
  const vault = new Vault(disk);
  await vault.load();
  const sync = new VaultSync(vault, store, { saveDelay: 0 });
  await sync.start();
  return { adapter: disk, vault, sync, store } satisfies Device;
}

/** Joins two devices and returns the function that separates them. */
function link(a: Device, b: Device) {
  const [left, right] = channelPair();
  a.sync.connect(left);
  b.sync.connect(right);
  return () => left.close();
}

/** Waits until both devices have nothing left to exchange or write. */
async function settle(...devices: Device[]) {
  for (let round = 0; round < 6; round++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
    for (const d of devices) await d.sync.settled();
  }
}

const files = async (d: Device) =>
  Object.fromEntries(
    await Promise.all(
      d.vault
        .getFiles()
        .map((f) => f.path)
        .sort()
        .map(async (p) => [p, p.endsWith('.png') ? [...(await d.vault.readBinary(p))] : await d.vault.read(p)] as const),
    ),
  );

describe('VaultSync', () => {
  it('brings a new device every note of the vault', async () => {
    const a = await device({ 'Plan.md': '# Plan', 'Projets/Idées.md': 'une idée' });
    const b = await device();
    link(a, b);
    await settle(a, b);
    expect(await files(b)).toEqual({ 'Plan.md': '# Plan', 'Projets/Idées.md': 'une idée' });
  });

  it('carries edits both ways, and merges edits made at the same time', async () => {
    const a = await device({ 'Note.md': 'début\n\nfin' });
    const b = await device();
    const unlink = link(a, b);
    await settle(a, b);
    await a.vault.modify('Note.md', 'début\n\nfin (A)');
    await settle(a, b);
    expect(await b.vault.read('Note.md')).toBe('début\n\nfin (A)');
    // Apart, each writes its own part of the note.
    unlink();
    await a.vault.modify('Note.md', 'début modifié par A\n\nfin (A)');
    await b.vault.modify('Note.md', 'début\n\nfin (A) ajoutée par B');
    link(a, b);
    await settle(a, b);
    const merged = 'début modifié par A\n\nfin (A) ajoutée par B';
    expect(await a.vault.read('Note.md')).toBe(merged);
    expect(await b.vault.read('Note.md')).toBe(merged);
  });

  it('follows a rename once, links included, without doubling them', async () => {
    const a = await device({ 'Ancien.md': 'contenu', 'Lien.md': 'Voir [[Ancien]].' });
    const b = await device();
    link(a, b);
    await settle(a, b);
    await a.vault.rename('Ancien.md', 'Dossier/Nouveau.md');
    await settle(a, b);
    expect(await files(b)).toEqual({ 'Dossier/Nouveau.md': 'contenu', 'Lien.md': 'Voir [[Nouveau]].' });
    expect(await files(a)).toEqual(await files(b));
  });

  it('follows a folder renamed with its notes', async () => {
    const a = await device({ 'Cours/Un.md': '1', 'Cours/Deux.md': '2' });
    const b = await device();
    link(a, b);
    await settle(a, b);
    await a.vault.rename('Cours', 'Archives/Cours 2025');
    await settle(a, b);
    expect(Object.keys(await files(b))).toEqual(['Archives/Cours 2025/Deux.md', 'Archives/Cours 2025/Un.md']);
  });

  it('follows two notes that swapped their names', async () => {
    const a = await device({ 'Un.md': '1', 'Deux.md': '2' });
    const b = await device();
    const unlink = link(a, b);
    await settle(a, b);
    unlink();
    await a.vault.rename('Un.md', 'Tmp.md');
    await a.vault.rename('Deux.md', 'Un.md');
    await a.vault.rename('Tmp.md', 'Deux.md');
    link(a, b);
    await settle(a, b);
    expect(await files(b)).toEqual({ 'Deux.md': '1', 'Un.md': '2' });
    expect(b.sync.model.live()).toHaveLength(2);
  });

  it('carries folders, empty ones too, through creation, rename and deletion', async () => {
    const a = await device({ 'Cours/Un.md': '1' });
    const b = await device();
    link(a, b);
    await settle(a, b);
    await a.vault.createFolder('Vide');
    await settle(a, b);
    expect(b.vault.getFolder('Vide')).toBeDefined();
    await a.vault.rename('Vide', 'Projets/Nouveau');
    await a.vault.rename('Cours', 'Archives');
    await settle(a, b);
    const folders = () =>
      b.vault
        .getFolders()
        .map((f) => f.path)
        .sort();
    expect(folders()).toEqual(['Archives', 'Projets', 'Projets/Nouveau']);
    expect(await b.vault.read('Archives/Un.md')).toBe('1');
    await a.vault.delete('Projets');
    await settle(a, b);
    expect(folders()).toEqual(['Archives']);
  });

  it('writes again later what a full disk refused, without losing it', async () => {
    const a = await device({ 'Note.md': 'un' });
    class FullDisk extends MemoryAdapter {
      full = true;
      override async write(path: string, data: string) {
        if (this.full && !path.startsWith('.')) throw Object.assign(new Error('no space left on device'), { code: 'ENOSPC' });
        return super.write(path, data);
      }
    }
    const disk = new FullDisk('Plein', {});
    const vault = new Vault(disk);
    await vault.load();
    const sync = new VaultSync(vault, new MemoryStore(), { saveDelay: 0, retryDelay: 20 });
    await sync.start();
    const b = { adapter: disk, vault, sync, store: new MemoryStore() };
    link(a, b);
    await settle(a, b);
    expect(sync.failedWrites.count).toBe(1);
    expect(vault.getFile('Note.md')).toBeUndefined();
    disk.full = false;
    await settle(a, b);
    expect(await vault.read('Note.md')).toBe('un');
    expect(sync.failedWrites.count).toBe(0);
  });

  it('sends a note deleted on one device to the trash of the other', async () => {
    const a = await device({ 'Garder.md': 'oui', 'Jeter.md': 'non' });
    const b = await device();
    link(a, b);
    await settle(a, b);
    await a.vault.delete('Jeter.md');
    await settle(a, b);
    expect(b.vault.getFile('Jeter.md')).toBeUndefined();
    expect(await b.adapter.read('.trash/Jeter.md')).toBe('non');
  });

  it('keeps both notes when two devices create the same name', async () => {
    const a = await device();
    const b = await device();
    await a.vault.create('Réunion.md', 'version A');
    await b.vault.create('Réunion.md', 'version B');
    link(a, b);
    await settle(a, b);
    const onA = await files(a);
    expect(onA).toEqual(await files(b));
    expect(Object.values(onA).sort()).toEqual(['version A', 'version B']);
    expect(Object.keys(onA).some((p) => /Réunion \(conflit [0-9a-f]{4}\)\.md/.test(p))).toBe(true);
  });

  it('merges two copies of the same vault without duplicating anything', async () => {
    const vault = { 'Plan.md': '# Plan', 'image.png': new Uint8Array([1, 2, 3]) };
    const a = await device(vault);
    const b = await device(vault);
    link(a, b);
    await settle(a, b);
    expect(Object.keys(await files(a))).toEqual(['Plan.md', 'image.png']);
    expect(Object.keys(await files(b))).toEqual(['Plan.md', 'image.png']);
    expect(a.sync.model.live()).toHaveLength(2);
  });

  it('copies attachments by their bytes', async () => {
    const a = await device({ 'image.png': new Uint8Array([9, 8, 7]) });
    const b = await device();
    link(a, b);
    await settle(a, b);
    expect([...(await b.vault.readBinary('image.png'))]).toEqual([9, 8, 7]);
    await a.vault.modifyBinary('image.png', new Uint8Array([1, 1]));
    await settle(a, b);
    expect([...(await b.vault.readBinary('image.png'))]).toEqual([1, 1]);
  });

  it('remembers across restarts, and merges what both devices wrote apart', async () => {
    const a = await device({ 'Journal.md': 'lundi' });
    const bStore = new MemoryStore();
    const b = await device({}, bStore);
    const unlink = link(a, b);
    await settle(a, b);
    unlink();
    await b.sync.stop();

    // Apart: A writes; B, closed, is changed on disk; then B starts again.
    await a.vault.modify('Journal.md', 'lundi\nmardi (A)');
    await b.adapter.write('Journal.md', 'dimanche (B)\nlundi');
    const again = await device({}, bStore, b.adapter);
    link(a, again);
    await settle(a, again);
    const merged = 'dimanche (B)\nlundi\nmardi (A)';
    expect(await a.vault.read('Journal.md')).toBe(merged);
    expect(await again.vault.read('Journal.md')).toBe(merged);
    expect(again.sync.model.live()).toHaveLength(1);
  });

  it('notices a note deleted while the app was closed', async () => {
    const store = new MemoryStore();
    const a = await device({ 'Parti.md': 'x', 'Reste.md': 'y' }, store);
    await a.sync.stop();
    await a.adapter.remove('Parti.md');
    const again = await device({}, store, a.adapter);
    expect(again.sync.model.live().map((e) => e.path)).toEqual(['Reste.md']);
  });
});
