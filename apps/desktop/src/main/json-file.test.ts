import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonFile } from './json-file';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'cobblestone-json-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('JsonFile', () => {
  it('starts from the fallback when the file is missing', async () => {
    const file = new JsonFile(path.join(dir, 'storage.json'), () => ({ a: 1 }));
    expect(await file.read()).toEqual({ a: 1 });
  });

  it('keeps every change when many arrive at once', async () => {
    const file = new JsonFile<Record<string, number>>(path.join(dir, 'storage.json'), () => ({}));
    await Promise.all(Array.from({ length: 40 }, (_, i) => file.update((store) => ({ ...store, [`k${i}`]: i }))));
    const saved = JSON.parse(await readFile(file.file, 'utf8')) as Record<string, number>;
    expect(Object.keys(saved)).toHaveLength(40);
    expect(await readdir(dir)).toEqual(['storage.json']);
  });

  it('recreates its folder when it was deleted meanwhile', async () => {
    const nested = path.join(dir, 'Cobblestone');
    const file = new JsonFile<string[]>(path.join(nested, 'vaults.json'), () => []);
    await file.update(() => ['a']);
    await rm(nested, { recursive: true });
    await file.update((list) => [...list, 'b']);
    expect(JSON.parse(await readFile(file.file, 'utf8'))).toEqual(['a', 'b']);
  });

  it('keeps working after a failed change', async () => {
    const file = new JsonFile<number>(path.join(dir, 'n.json'), () => 0);
    await expect(
      file.update(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await file.update((n) => n + 1)).toBe(1);
  });
});
