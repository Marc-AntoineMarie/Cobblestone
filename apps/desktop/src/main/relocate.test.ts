import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findFolder, folderId, searchAreas } from './relocate';

let home: string;
let vault: string;
let id: string;

beforeEach(async () => {
  home = await mkdtemp(path.join(tmpdir(), 'cobblestone-home-'));
  vault = path.join(home, 'Documents', 'Notes');
  await mkdir(path.join(vault, 'Inside'), { recursive: true });
  await mkdir(path.join(home, 'Documents', 'Other'), { recursive: true });
  id = (await folderId(vault))!;
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

const find = () => findFolder(id, searchAreas(vault, home));

describe('findFolder', () => {
  it('finds a vault renamed in place', async () => {
    await rename(vault, path.join(home, 'Documents', 'Notes 2026'));
    expect(await find()).toBe(path.join(home, 'Documents', 'Notes 2026'));
  });

  it('finds a vault moved into another folder', async () => {
    await mkdir(path.join(home, 'Archive', 'Old'), { recursive: true });
    await rename(vault, path.join(home, 'Archive', 'Old', 'Notes'));
    expect(await find()).toBe(path.join(home, 'Archive', 'Old', 'Notes'));
  });

  it('does not take a copy or a folder in the trash for the vault', async () => {
    await mkdir(path.join(home, 'Documents', 'Notes copy'));
    await mkdir(path.join(home, '.local', 'Trash'), { recursive: true });
    await rename(vault, path.join(home, '.local', 'Trash', 'Notes'));
    expect(await find()).toBeNull();
  });

  it('gives up after its budget', async () => {
    await rename(vault, path.join(home, 'Documents', 'Other', 'Notes'));
    expect(await findFolder(id, searchAreas(vault, home), 1)).toBeNull();
  });
});
