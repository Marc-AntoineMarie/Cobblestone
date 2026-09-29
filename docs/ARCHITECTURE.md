# Architecture

## Principles

- **Files are the truth.** A vault is a folder of Markdown files and attachments. Every feature reads and writes those files; nothing important lives only in a database.
- **One engine, several hosts.** `@cobblestone/core` knows nothing about browsers, Electron or Node. Each host provides storage through the `VaultAdapter` interface, and the shared interface through the `Platform` interface.
- **Each host stands alone.** The web app and the desktop app are both complete. Neither needs the other, and neither will need a server for local use.

## Packages

```
packages/core     engine (no DOM, no Node)
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

## Next: sync

Each note will get a Yjs document persisted in `.cobblestone/`, bridged to its file both ways. Devices exchange updates over WebRTC (with a small signaling service), encrypted end to end. A relay peer, self-hosted or hosted, keeps shared documents available when no device is online. See [ROADMAP.md](ROADMAP.md).
