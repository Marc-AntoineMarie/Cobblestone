import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Vault, type AdapterChange } from '@cobblestone/core';
import { NodeFsAdapter } from './fs-adapter';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'cobblestone-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('NodeFsAdapter', () => {
  it('lists, reads and writes files with vault paths', async () => {
    await mkdir(path.join(root, 'Notes', 'Deep'), { recursive: true });
    await writeFile(path.join(root, 'Notes', 'Deep', 'A.md'), '# A');
    await mkdir(path.join(root, '.obsidian'));
    await writeFile(path.join(root, '.obsidian', 'app.json'), '{}');
    const adapter = new NodeFsAdapter(root);

    const listing = (await adapter.list()).map((s) => `${s.type}:${s.path}`).sort();
    expect(listing).toEqual(['file:.obsidian/app.json', 'file:Notes/Deep/A.md', 'folder:.obsidian', 'folder:Notes', 'folder:Notes/Deep']);
    expect(await adapter.read('Notes/Deep/A.md')).toBe('# A');

    await adapter.write('New/B.md', 'b');
    expect(await readFile(path.join(root, 'New', 'B.md'), 'utf8')).toBe('b');
    await adapter.rename('New', 'Moved');
    expect(await adapter.stat('Moved/B.md')).toMatchObject({ type: 'file', size: 1 });
    await adapter.remove('Moved');
    expect(await adapter.stat('Moved')).toBeNull();
  });

  it('refuses paths escaping the vault', async () => {
    const adapter = new NodeFsAdapter(root);
    expect(() => adapter.resolve('../outside.md')).not.toThrow(); // normalized to "outside.md"
    expect(adapter.resolve('../outside.md')).toBe(path.join(root, 'outside.md'));
    await expect(adapter.remove('')).rejects.toThrow();
  });

  it('opens a real vault with the core Vault', async () => {
    await writeFile(path.join(root, 'A.md'), '[[B]]');
    await writeFile(path.join(root, 'B.md'), 'back to [[A]]');
    const vault = new Vault(new NodeFsAdapter(root));
    await vault.load();
    await vault.rename('B.md', 'Renamed.md');
    expect(await readFile(path.join(root, 'A.md'), 'utf8')).toBe('[[Renamed]]');
    vault.close();
  });

  it('reports external changes', async () => {
    const adapter = new NodeFsAdapter(root);
    const changes: AdapterChange[] = [];
    const stop = adapter.watch((c) => changes.push(c));
    await new Promise((r) => setTimeout(r, 200));
    await writeFile(path.join(root, 'External.md'), 'hi');
    await writeFile(path.join(root, '.hidden.md'), 'ignored');
    for (let i = 0; i < 40 && changes.length === 0; i++) await new Promise((r) => setTimeout(r, 50));
    stop();
    expect(changes).toContainEqual({ type: 'created', kind: 'file', path: 'External.md' });
    expect(changes.some((c) => c.path.startsWith('.'))).toBe(false);
  });
});
