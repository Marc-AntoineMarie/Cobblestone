import diff from 'fast-diff';
import * as Y from 'yjs';

/*
 * The vault as a CRDT (Yjs): one map of files by a stable id. A text file keeps
 * its content as a Y.Text, merged character by character between devices; a
 * binary file keeps the hash of its bytes, fetched from a device that has them.
 * The id survives renames; a deleted file stays as a tombstone so that an old
 * copy cannot bring it back.
 */

export type EntryKind = 'text' | 'binary';

/** Extensions merged as text; everything else travels as bytes. */
const TEXT_EXTENSIONS = new Set(['md', 'markdown', 'canvas', 'txt', 'css', 'json', 'csv', 'base', 'yaml', 'yml']);

export function kindOf(path: string): EntryKind {
  const dot = path.lastIndexOf('.');
  return dot > path.lastIndexOf('/') && TEXT_EXTENSIONS.has(path.slice(dot + 1).toLowerCase()) ? 'text' : 'binary';
}

export interface Entry {
  id: string;
  path: string;
  kind: EntryKind;
  deleted: boolean;
  /** Binary files: SHA-256 of the bytes, and their size. */
  hash?: string;
  size?: number;
}

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class VaultDoc {
  readonly files: Y.Map<Y.Map<unknown>>;

  constructor(readonly doc: Y.Doc = new Y.Doc()) {
    this.files = doc.getMap('files');
  }

  entry(id: string): Entry | null {
    const map = this.files.get(id);
    if (!map) return null;
    return {
      id,
      path: map.get('path') as string,
      kind: map.get('kind') as EntryKind,
      deleted: map.get('deleted') === true,
      hash: map.get('hash') as string | undefined,
      size: map.get('size') as number | undefined,
    };
  }

  entries(): Entry[] {
    return [...this.files.keys()].map((id) => this.entry(id)!).filter((e) => typeof e.path === 'string');
  }

  live(): Entry[] {
    return this.entries().filter((e) => !e.deleted);
  }

  text(id: string): Y.Text | null {
    const text = this.files.get(id)?.get('text');
    return text instanceof Y.Text ? text : null;
  }

  /** Adds a file. Call inside a transaction of the right origin. */
  add(path: string, content: { text: string } | { hash: string; size: number }, id = newId()): string {
    const map = new Y.Map<unknown>();
    map.set('path', path);
    if ('text' in content) {
      map.set('kind', 'text');
      map.set('text', new Y.Text(content.text));
    } else {
      map.set('kind', 'binary');
      map.set('hash', content.hash);
      map.set('size', content.size);
    }
    this.files.set(id, map);
    return id;
  }

  set(id: string, patch: Partial<Omit<Entry, 'id' | 'kind'>>) {
    const map = this.files.get(id);
    if (!map) return;
    for (const [key, value] of Object.entries(patch)) if (map.get(key) !== value) map.set(key, value);
  }

  /**
   * Live entries sharing a path, settled the same way on every device: the
   * smallest id keeps the path; a copy with the same content is merged into it
   * (two devices that started from the same folder), a different one gets a
   * conflict name. Returns whether anything changed.
   */
  settleConflicts(): boolean {
    const byPath = new Map<string, Entry[]>();
    for (const entry of this.live()) {
      const key = entry.path.toLowerCase();
      byPath.set(key, [...(byPath.get(key) ?? []), entry]);
    }
    let changed = false;
    for (const group of byPath.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) => a.id.localeCompare(b.id));
      const [keeper, ...others] = group;
      for (const other of others) {
        if (this.sameContent(keeper!, other)) {
          this.set(other.id, { deleted: true });
        } else {
          this.set(other.id, { path: conflictPath(other.path, other.id) });
        }
        changed = true;
      }
    }
    return changed;
  }

  private sameContent(a: Entry, b: Entry): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'binary') return a.hash === b.hash;
    return this.text(a.id)?.toString() === this.text(b.id)?.toString();
  }
}

/** "Notes/Plan.md" → "Notes/Plan (conflit 3fa2).md". */
export function conflictPath(path: string, id: string): string {
  const slash = path.lastIndexOf('/');
  const dot = path.lastIndexOf('.');
  const tag = ` (conflit ${id.slice(0, 4)})`;
  return dot > slash ? path.slice(0, dot) + tag + path.slice(dot) : path + tag;
}

/** Turns `text` into `next` with the fewest edits, so concurrent edits elsewhere survive. */
export function applyTextDiff(text: Y.Text, next: string): boolean {
  const current = text.toString();
  if (current === next) return false;
  let index = 0;
  for (const [op, chunk] of diff(current, next)) {
    if (op === diff.EQUAL) index += chunk.length;
    else if (op === diff.DELETE) text.delete(index, chunk.length);
    else {
      text.insert(index, chunk);
      index += chunk.length;
    }
  }
  return true;
}

/** SHA-256 of bytes, in hexadecimal. */
export async function hashBytes(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
