import { describe, expect, it } from 'vitest';
import { MemoryAdapter } from './adapters/memory';
import { LinkResolver } from './links/resolver';
import { Vault } from './vault';

async function vaultOf(files: Record<string, string>) {
  const adapter = new MemoryAdapter('Test', files);
  const vault = new Vault(adapter);
  await vault.load();
  return { vault, adapter };
}

describe('LinkResolver', () => {
  const resolver = new LinkResolver([
    'Home.md',
    'Projects/Alpha.md',
    'Projects/Index.md',
    'Archive/Index.md',
    'Archive/Old/Alpha.md',
    'assets/diagram.png',
    'Note.v2.md',
  ]);

  it('resolves bare names, paths, extensions and case', () => {
    expect(resolver.resolve('home', 'x.md')).toBe('Home.md');
    expect(resolver.resolve('Projects/Alpha', 'x.md')).toBe('Projects/Alpha.md');
    expect(resolver.resolve('Home.md', 'x.md')).toBe('Home.md');
    expect(resolver.resolve('diagram.png', 'x.md')).toBe('assets/diagram.png');
    expect(resolver.resolve('Note.v2', 'x.md')).toBe('Note.v2.md');
    expect(resolver.resolve('Missing', 'x.md')).toBeNull();
  });

  it('prefers the linking note folder, then the shortest path', () => {
    expect(resolver.resolve('Index', 'Archive/Notes.md')).toBe('Archive/Index.md');
    expect(resolver.resolve('Index', 'Projects/Notes.md')).toBe('Projects/Index.md');
    expect(resolver.resolve('Alpha', 'Home.md')).toBe('Projects/Alpha.md');
    expect(resolver.resolve('Old/Alpha', 'Home.md')).toBe('Archive/Old/Alpha.md');
  });

  it('resolves explicit relative paths', () => {
    expect(resolver.resolve('../Projects/Alpha', 'Archive/Notes.md')).toBe('Projects/Alpha.md');
    expect(resolver.resolve('./Alpha', 'Archive/Old/Notes.md')).toBe('Archive/Old/Alpha.md');
    expect(resolver.resolve('./Alpha', 'Home.md')).toBeNull();
  });

  it('generates the shortest unambiguous link text', () => {
    expect(resolver.linkText('Home.md', 'x.md')).toBe('Home');
    expect(resolver.linkText('Projects/Index.md', 'x.md')).toBe('Projects/Index');
    expect(resolver.linkText('assets/diagram.png', 'x.md')).toBe('diagram.png');
    expect(resolver.linkText('Projects/Alpha.md', 'Archive/Old/x.md', 'relative')).toBe('../../Projects/Alpha');
  });
});

describe('Vault', () => {
  it('does not take a note it cannot read for an empty one', async () => {
    const adapter = new MemoryAdapter('Test', { 'Locked.md': 'précieux', 'Open.md': 'ok' });
    const read = adapter.read.bind(adapter);
    adapter.read = (path: string) => (path === 'Locked.md' ? Promise.reject(new Error('EACCES')) : read(path));
    const vault = new Vault(adapter);
    await vault.load();
    expect(vault.getFile('Locked.md')).toBeDefined();
    expect(vault.cachedRead('Locked.md')).toBeUndefined();
    await expect(vault.read('Locked.md')).rejects.toThrow('EACCES');
    expect(vault.cachedRead('Open.md')).toBe('ok');
  });

  it('gives links the new case of a note renamed from "note" to "Note"', async () => {
    const { vault } = await vaultOf({ 'idea.md': 'x', 'A.md': 'See [[idea]] and [[idea|alias]].' });
    await vault.rename('idea.md', 'Idea.md');
    expect(await vault.read('A.md')).toBe('See [[Idea]] and [[Idea|alias]].');
  });

  it('reports its progress and can be stopped while loading', async () => {
    const files = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`N${i}.md`, `note ${i}`]));
    const progress: number[] = [];
    await new Vault(new MemoryAdapter('Big', files)).load({ onProgress: (done, total) => progress.push(done, total) });
    expect(progress.slice(0, 2)).toEqual([0, 150]);
    expect(progress.slice(-2)).toEqual([150, 150]);

    const controller = new AbortController();
    const vault = new Vault(new MemoryAdapter('Big', files));
    const loading = vault.load({ signal: controller.signal, onProgress: (done) => done >= 64 && controller.abort() });
    await expect(loading).rejects.toThrow();
    expect(vault.isReady).toBe(false);
  });

  it('indexes notes, links, backlinks and tags on load', async () => {
    const { vault } = await vaultOf({
      'A.md': 'Links to [[B]] and [[Missing]] #tag/sub',
      'folder/B.md': '---\ntags: [tag]\n---\nBack to [[A|home]].',
      '.obsidian/app.json': '{}',
    });
    expect(
      vault
        .getFiles()
        .map((f) => f.path)
        .sort(),
    ).toEqual(['A.md', 'folder/B.md']);
    expect(vault.getFolders().map((f) => f.path)).toEqual(['folder']);
    expect([...vault.cache.getResolvedLinks('A.md').keys()]).toEqual(['folder/B.md']);
    expect([...vault.cache.getUnresolvedLinks('A.md').keys()]).toEqual(['Missing']);
    expect(vault.cache.getBacklinks('A.md').map((b) => b.source)).toEqual(['folder/B.md']);
    expect(Object.fromEntries(vault.cache.getTags())).toEqual({ '#tag': 2, '#tag/sub': 1 });
    expect(vault.cache.getNotesWithTag('tag')).toEqual(['A.md', 'folder/B.md']);
  });

  it('resolves pending links when the target is created, and unresolves on delete', async () => {
    const { vault } = await vaultOf({ 'A.md': '[[Later]]' });
    expect(vault.cache.getUnresolvedLinks('A.md').has('Later')).toBe(true);
    await vault.create('sub/Later.md', 'hello');
    expect(vault.cache.getResolvedLinks('A.md').get('sub/Later.md')).toBe(1);
    expect(vault.getFolder('sub')).toBeDefined();
    await vault.delete('sub/Later.md');
    expect(vault.cache.getUnresolvedLinks('A.md').has('Later')).toBe(true);
  });

  it('moves deleted files to the vault trash', async () => {
    const { vault, adapter } = await vaultOf({ 'A.md': 'a' });
    await vault.delete('A.md');
    expect(vault.getFile('A.md')).toBeUndefined();
    expect(await adapter.read('.trash/A.md')).toBe('a');
  });

  it('rewrites links everywhere when a note is renamed', async () => {
    const { vault } = await vaultOf({
      'Old.md': 'I link to [[#Top]] myself',
      'A.md': 'See [[Old]], [[Old#Top|top]], ![[Old]] and [text](Old.md) and [[Other]].',
      'Other.md': '| t |\n|---|\n| [[Old\\|alias]] |',
    });
    await vault.rename('Old.md', 'New Name.md');
    expect(await vault.read('A.md')).toBe(
      'See [[New Name]], [[New Name#Top|top]], ![[New Name]] and [text](New%20Name.md) and [[Other]].',
    );
    expect(await vault.read('Other.md')).toBe('| t |\n|---|\n| [[New Name\\|alias]] |');
    expect(await vault.read('New Name.md')).toBe('I link to [[#Top]] myself');
    expect(vault.cache.getBacklinks('New Name.md').map((b) => b.source)).toEqual(['A.md', 'Other.md']);
  });

  it('uses a path when the new name becomes ambiguous', async () => {
    const { vault } = await vaultOf({
      'x/Target.md': '',
      'y/Clash.md': '',
      'A.md': '[[Target]]',
    });
    await vault.rename('x/Target.md', 'x/Clash.md');
    expect(await vault.read('A.md')).toBe('[[x/Clash]]');
  });

  it('moves folders and fixes relative links of moved notes', async () => {
    const { vault } = await vaultOf({
      'docs/Guide.md': 'See [sibling](./Sibling.md) and [[Home]] and [up](../Home.md)',
      'docs/Sibling.md': '',
      'Home.md': '[[docs/Guide]] [[Guide]]',
    });
    await vault.rename('docs', 'archive/docs');
    expect(vault.getFile('archive/docs/Guide.md')).toBeDefined();
    // Partial paths that still resolve are left untouched, like any unaffected link.
    expect(await vault.read('Home.md')).toBe('[[docs/Guide]] [[Guide]]');
    expect(vault.cache.getResolvedLinks('Home.md').get('archive/docs/Guide.md')).toBe(2);
    expect(await vault.read('archive/docs/Guide.md')).toBe('See [sibling](./Sibling.md) and [[Home]] and [up](../../Home.md)');
  });

  it('handles case-only renames', async () => {
    const { vault } = await vaultOf({ 'note.md': '', 'A.md': '[[note]]' });
    await vault.rename('note.md', 'Note.md');
    expect(vault.getFile('Note.md')).toBeDefined();
    expect(vault.getFile('note.md')).toBeUndefined();
    expect(vault.cache.getResolvedLinks('A.md').get('Note.md')).toBe(1);
  });

  it('picks up external changes and ignores its own writes', async () => {
    const { vault, adapter } = await vaultOf({ 'A.md': '[[B]]' });
    const events: string[] = [];
    vault.on('create', (f) => events.push('create ' + f.path));
    vault.on('modify', (f) => events.push('modify ' + f.path));
    vault.on('rename', (p, o) => events.push(`rename ${o} -> ${p}`));
    vault.on('delete', (p) => events.push('delete ' + p));

    await vault.modify('A.md', '[[B]] edited');
    await adapter.write('B.md', 'external');
    await vault.settled();
    await adapter.rename('B.md', 'C.md');
    await vault.settled();
    await adapter.remove('C.md');
    await vault.settled();

    expect(events).toEqual(['modify A.md', 'create B.md', 'rename B.md -> C.md', 'delete C.md']);
    expect(vault.cache.getUnresolvedLinks('A.md').has('B')).toBe(true);
  });

  it('applies option changes while open', async () => {
    const { vault, adapter } = await vaultOf({ 'Old.md': '', 'A.md': '[[Old]]' });
    vault.setOptions({ updateLinksOnRename: false, trash: 'permanent' });
    await vault.rename('Old.md', 'New.md');
    expect(await vault.read('A.md')).toBe('[[Old]]');
    await vault.delete('New.md');
    expect(await adapter.stat('.trash/New.md')).toBeNull();
  });
});
