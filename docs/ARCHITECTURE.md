# Architecture

## Principles

- **Files are the truth.** A vault is a folder of Markdown files and attachments. Every feature reads and writes those files; nothing important lives only in a database.
- **One engine, several hosts.** `@cobblestone/core` knows nothing about browsers, Electron or Node. Each host provides storage through the `VaultAdapter` interface, and the shared interface through the `Platform` interface.
- **Each host stands alone.** The web app and the desktop app are both complete. Neither needs the other, and neither will need a server for local use.

## Packages

```
packages/core     engine (no DOM, no Node)
packages/sync     sync between devices (Yjs)         → used by packages/app
packages/node     Node file system adapter          → used by apps/desktop (main process)
packages/app      shared React interface            → used by apps/web and apps/desktop (renderer)
apps/web          browser host
apps/desktop      Electron host
```

### Core (`packages/core`)

- `markdown/parse.ts` scans a note into `NoteMetadata`: frontmatter, headings, links and embeds (wiki and Markdown), tags, block ids, list items and tasks, sections. It masks code, math, comments and escapes first, so offsets stay exact.
- `links/resolver.ts` resolves link paths like Obsidian (exact path, relative path, then the shortest matching path, case-insensitive) and generates link text.
- `links/rewrite.ts` rebuilds links for a new target while keeping their style (wiki or Markdown, alias, subpath, path format).
- `metadata-cache.ts` indexes the whole vault: resolved and unresolved links, backlinks, tags, aliases. It re-resolves only the notes a file change can affect.
- `vault.ts` wraps an adapter: loading, create, modify, rename (with link updates), delete to `.trash`, and external changes. All mutations and external events run through one queue, so the vault never sees half-applied states.
- `search/` parses Obsidian's query language and evaluates it over notes.
- `canvas.ts` reads and writes JSON Canvas files exactly as Obsidian does, and keeps their file references in step with renames.

### Hosts

- **Desktop**: the main process owns the file system (`NodeFsAdapter`, chokidar for external changes). The renderer is sandboxed with context isolation and reaches files only through `fs:call` for vaults opened in that window; every path is checked to stay inside the vault.
- **Web**: `DirectoryHandleAdapter` works on a folder chosen by the user (File System Access API) or on the browser's private storage (OPFS). External changes come from `FileSystemObserver` where available, otherwise from a light rescan.

### Interface (`packages/app`)

- `session.ts` holds an open vault: settings, workspace layout, UI state, commands and file actions.
- `workspace/` is a pure model of panes, tabs, splits and history.
- `editor/` is CodeMirror 6 with Obsidian syntax (`ofm-syntax.ts`), live preview (`live-preview.ts`), link completion and formatting commands.
- `markdown/render.ts` renders the reading view with markdown-it and Obsidian extensions; its HTML is always sanitised (DOMPurify) before reaching the page, because shared notes are untrusted.
- `ui/` holds the React components; `styles/` the design system tokens and styles.

## Settings

- Per vault, in `.cobblestone/app.json`. On first open they are imported from `.obsidian/` when present.
- Per device (theme, language, open tabs, recent files, graph pins) in the host's storage, so they do not travel with the vault or conflict between devices.

## Sync (`packages/sync`)

The engine is written; no host runs it yet. See [ROADMAP.md](ROADMAP.md).

- **One CRDT per vault** (`model.ts`): a Yjs map of files by a stable id that survives renames. A text file holds a `Y.Text`, merged character by character; a binary file holds the SHA-256 of its bytes, fetched by hash from a device that has them. A deleted file stays as a tombstone. Two live files on one path are settled the same way on every device: the smallest id keeps the name, an identical copy is merged, a different one is renamed "Name (conflit abcd).md".
- **Files stay the truth** (`vault-sync.ts`): `VaultSync` turns the vault's events into CRDT changes (a text edit becomes the smallest diff) and writes what other devices changed back through the vault, so the app shows it like any other change: deletions, then moves, then contents. It recognises the echo of its own writes. The CRDT is saved in `.cobblestone/sync/vault.bin`; on start, what changed on disk meanwhile is taken in.
- **Transport-agnostic** (`protocol.ts`): a `SyncChannel` carries messages (`hello` with a state vector, `update`, and blob requests), encoded as bytes. Tests join devices in memory with `channelPair()`.
- **Devices and encryption** (`identity.ts`, `session.ts`, `channel.ts`): each device has an X25519 key pair; the secret half stays in the device's own storage, never in the vault. The CRDT lists the vault's devices by public key (removed ones stay listed and are refused). Two paired devices open a session with a 3DH key agreement in which each proves its key, then exchange AES-256-GCM frames whose nonce is a counter (a replayed or reordered frame ends the link). Transports only move bytes (`ByteChannel`).
- **Pairing** (`pairing.ts`): a nine-symbol code shown on the device that has the vault and typed on the other. The code never travels: CPace, a password-authenticated key exchange on ristretto255, gives both sides the same keys only if they used the same code; an eavesdropper learns nothing, an impostor gets one guess per attempt. The new device then sends its public key, the user accepts it, and the vault flows on the same encrypted link. Primitives come from `@noble/curves` and `@noble/hashes` (audited).
- **Devices together** (`node.ts`, `network.ts`): `SyncNode` runs one device's part: it announces the vault on a `Network` under a tag that reveals nothing of it, opens a session with each device found (one per device, the same one kept on both sides), closes the session of a removed device, and hosts pairings (five minutes, three wrong codes). `receiveVault` is the other side of a pairing. `MemoryNetworkHub` plays a network in tests.
- **Local network** (`apps/desktop/src/main/lan.ts`, `lan-ipc.ts`, `renderer/network.ts`): on desktop, the main process announces tags by UDP multicast and carries links over TCP (length-prefixed frames, the first naming the tag); it only moves encrypted bytes, and refuses unknown tags, slow greetings and oversized frames. Windows reach it through IPC, only for their own links and for announced addresses. `Platform.syncNetwork` gives it to the app.
- **In the app** (`packages/app/src/sync.ts`): `SyncController` keeps the device's key pair and the vaults it syncs in the host's storage (never in the vault), with the devices it knew so that a lost `.cobblestone/sync` does not strand it. The interface: Settings › Sync, the add-device dialog, « Receive a vault » on the start screen, the status bar.
- **Next**: live editing (the editor bound to the shared text); then WebRTC with a small, self-hostable signaling service, and an encrypted relay for when no other device is online.
- **Known limit**: the editor saves 350 ms after the last key, and the engine works from the saved file; text typed at the same moment on two devices can lose a few characters. Binding the editor to the `Y.Text` (y-codemirror) will remove it.
