# The vault, and where its bytes live

A vault is a folder of Markdown files and attachments. This document describes the model around that
folder, and then, host by host, exactly where the bytes sit and who can read them.

## The model

- **`VaultAdapter`** (`packages/core/src/adapter.ts`) is the whole of what storage must offer:
  `list`, `stat`, `read`, `readBinary`, `write`, `writeBinary`, `mkdir`, `remove`, `rename`, and an
  optional `watch` for changes made outside the app. Nothing else in the engine knows about files.
- **Paths** (`packages/core/src/path.ts`) are always POSIX, vault-relative, with no leading or
  trailing slash: `Folder/Sub/Note.md`. The root is `""`. `normalizePath` resolves `.` and `..`, so
  a path can never climb out of the vault. Anything with a dot-prefixed segment is hidden
  (`isHidden`), and hidden entries are not part of the vault's content: `.obsidian/`,
  `.cobblestone/`, `.trash/`, `.git/` are skipped by the index, the tree and search.
- **`Vault`** (`packages/core/src/vault.ts`) wraps one adapter. It holds the list of files and
  folders, a bounded cache of note texts, the metadata index (`vault.cache`), and the operations:
  `create`, `modify`, `process`, `createFolder`, `delete`, `rename`. It emits events
  (`create`, `modify`, `delete`, `rename`, `folder-create`, `ready`) that the interface listens to.

### Two things worth knowing about `Vault`

**Everything runs in one queue.** `op()` serialises every mutation and every external change, so
two writes, or a write and a file-watcher event, never interleave. Code already inside an operation
calls the internal `doCreate`/`doModify`/… directly — calling `op()` again would deadlock.
`settled()` waits for the queue to drain, which is what the tests use.

**Rename rewrites links.** `rename` snapshots the links pointing at the moved files _before_ the
index changes, moves the file, then rewrites links in every affected note, keeping each link's style
(wiki or Markdown, alias, subpath, path format) and leaving links that still resolve correctly
alone. Canvas files that show a moved file are repointed too. `rename(from, to, { updateLinks:
false })` skips all of it: a rename arriving from another device already carries its own link edits.

**Deleting** moves the file to `.trash/` inside the vault, as Obsidian does, unless the vault's
settings say permanent. A name already taken in the trash gets a free one.

**Unreadable is not empty.** During the initial scan, a note that cannot be read (permissions, a
file locked by another program) stays unread rather than being treated as empty, so nothing is ever
saved over it.

**External changes** come from `adapter.watch`. They are applied in the same queue and are
idempotent: the vault recognises the echo of its own writes and ignores it.

## Settings files

| What                                                                                                       | Where                                                        | Travels with the vault |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------- |
| Per-vault settings (new-note folder, attachments, line width, text size, daily notes, templates, snippets) | `.cobblestone/app.json` in the vault                         | yes                    |
| The vault's CRDT for sync                                                                                  | `.cobblestone/sync/vault.bin`                                | yes                    |
| CSS snippets                                                                                               | `.cobblestone/snippets/`, or read from `.obsidian/snippets/` | yes                    |
| Per-device preferences (theme, language, layout, open tabs, recent files, graph pins)                      | the host's own storage                                       | no                     |
| Device identity and sync state                                                                             | the host's own storage                                       | no                     |

On a vault's first open, what can be imported from `.obsidian/` is imported (attachment folder, new
note location, line breaks, trash behaviour, default view, text size, daily notes, bookmarks).
**`.obsidian/` is never written to.** That is a product promise, not an implementation detail.

## Desktop (`apps/desktop`)

The main process owns the file system; the renderer is sandboxed with context isolation and never
touches Node.

- `NodeFsAdapter` (`packages/node`) does the real work. Its `resolve()` refuses any path that
  escapes the vault root. External changes come from chokidar.
- The renderer talks to it through one narrow bridge (`apps/desktop/src/preload/index.ts`):
  `fs:call` with a vault id, a method name from a fixed list, and arguments. The main process looks
  up the adapter **registered for that window and that vault id** — a window can only reach vaults
  it opened itself. `shell:reveal` resolves through the same adapter, so the renderer cannot point
  the file manager anywhere else.
- `vaults:pick` / `vaults:create` refuse folders that cannot be a vault
  (`main/locations.ts`): the app's own data folder, the home folder or a whole drive (which would
  index everything the user owns), the folder that used to contain a lost vault, or another vault.
- App data lives in Electron's `userData`: `vaults.json` (the recent list, with each vault's folder)
  and `storage.json` (the `Platform.storage` key/value store). `COBBLESTONE_USER_DATA` moves it,
  which is how the end-to-end tests stay isolated.
- A vault whose folder was renamed or moved is looked for (`main/relocate.ts`) and can be followed,
  keeping its id, tabs and settings.

## Web (`apps/web`)

One adapter, `DirectoryHandleAdapter`, serves both kinds of folder: it works on a
`FileSystemDirectoryHandle`, whatever that handle points to. External changes come from
`FileSystemObserver` where it exists (recent Chromium), otherwise from a rescan when the window
regains focus and every few seconds while it is visible.

`apps/web/src/platform.ts` decides which handle:

| Vault kind | Handle                                                                 | Where the files really are                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `folder`   | `window.showDirectoryPicker()` (File System Access API, Chromium only) | the folder the user picked, on their disk. Nothing is copied. The handle is kept in IndexedDB, but **browsers forget the permission between sessions**, so reopening asks again (it needs a click). |
| `browser`  | `navigator.storage.getDirectory()` → `vaults/<uuid>`                   | real files in the **origin private file system**: inside the browser profile, on the user's disk, reachable only by this origin.                                                                    |
| `demo`     | none                                                                   | `MemoryAdapter`, sample notes in memory. Nothing is saved.                                                                                                                                          |

Beside the files, IndexedDB (database `cobblestone`, store `kv`) holds: the list of vaults
(`vaults`), the directory handle of each picked folder (`handle:<id>`), and everything
`Platform.storage` keeps (`storage:*`) — preferences, layout, open tabs, the device's sync identity
and the account token. `localStorage` holds one thing: note text that a write had not finished
saving when the page went away, rewritten at the next open (`Session.saveText`).

### What this means for confidentiality

- **The vault is never uploaded.** There is no server-side copy, and no code path that sends note
  text anywhere except an end-to-end encrypted sync session the user has paired.
- **A `browser` vault is readable by this origin only.** No other site, no third-party script, no
  other browser profile. It is _not_ encrypted at rest: anyone with the user's OS session, their
  browser profile folder, or a backup of it, can read it — exactly as with a folder of Markdown
  files. Full-disk encryption is the answer, not something the app can add on top of OPFS.
- **The device's secret sync key sits in the same IndexedDB, in the clear.** Whoever can read the
  profile can also impersonate that device. See [security.md](security.md).
- **"Forget this vault" on a `browser` vault deletes it** (`forgetVault` removes the folder
  recursively) — that is the right move on a borrowed machine. For a `folder` vault it only drops
  the entry and the handle; the files stay where they are.
- Clearing site data in the browser deletes a `browser` vault and all preferences. The app does not
  call `navigator.storage.persist()`, so a browser under storage pressure may evict a `browser`
  vault: that is a known risk of **data loss** (not of disclosure), tracked in
  `contribution/IDEES.md`.

## Tests

`MemoryAdapter` (`packages/core/src/adapters/memory.ts`) is the third adapter: the unit tests build
vaults in memory, and the demo vault uses it too. An adapter is a small interface on purpose —
a new backend (S3, WebDAV, Git) is a new adapter and nothing else.
