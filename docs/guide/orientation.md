# Orientation — finding your way in the code

Read this first. It says what the pieces are, which rules hold everywhere, and where to put a change.
The other documents in this folder each take one part and go deep.

## The one-paragraph version

A vault is a folder of Markdown files on a disk. `@cobblestone/core` turns that folder into an
indexed model (files, links, tags, search) and performs the operations (create, modify, rename,
delete) while keeping the index and the links in other notes correct. It reaches storage only
through a `VaultAdapter`, which each host provides: real files on the desktop, a picked folder or
the browser's private storage on the web, memory in tests. `@cobblestone/app` is the whole
interface, shared by both hosts: a `Session` object per open vault, a pure workspace model for
panes and tabs, a CodeMirror editor and a Markdown renderer. `@cobblestone/sync` makes two devices
of the same vault agree, over the local network or through `apps/relay`. Nothing in the app needs a
server to work on one device.

## Layers, and what may depend on what

```
apps/web      apps/desktop                 (hosts: storage, system, windows)
      \          /
    packages/app                           (interface: React, CodeMirror, session, settings)
      /         \
packages/core   packages/sync              (engine: files, index, links)   (CRDT, devices, transport)
                      \
                  apps/relay               (server: meeting point, accounts)
```

Rules that never bend:

- `packages/core` imports nothing from a browser or from Node. No DOM, no `fs`, no `window`.
- `packages/app` imports `core` and `sync`, never a host. Whatever it needs from the host goes
  through the `Platform` interface (`packages/app/src/platform.ts`).
- `packages/sync` imports `core` (it writes through a `Vault`), never `app`.
- A host (`apps/web`, `apps/desktop`) implements `Platform` and `VaultAdapter` and mounts the app.
  It holds no feature of its own.
- `apps/relay` shares nothing with the interface. It knows tags, links and accounts — never notes.

## The invariants

These are the promises the whole product rests on. A change that breaks one is a bug, even when the
tests pass.

1. **Files are the truth.** Every feature reads and writes the vault's files. No feature may depend
   on a database that the files do not describe. The CRDT, the index and the caches are all
   rebuildable from the folder.
2. **`.obsidian/` is read, never written.** Cobblestone's own settings live in `.cobblestone/`.
   A vault must stay openable in Obsidian at any moment.
3. **Each host stands alone.** The web app is not a client of the desktop app, and neither needs a
   server for local use.
4. **Rendered Markdown is untrusted.** Everything that reaches the DOM from a note passes through
   `sanitize` (DOMPurify). A note can come from a share or from another device.
5. **Nothing leaves the device without the user asking.** No telemetry, no silent upload; sync only
   for vaults the user has paired, and only end-to-end encrypted.
6. **Every visible string goes through `t()`** in `packages/app/src/i18n.ts`, in English and French.
7. **One queue per vault.** All mutations and external changes run through `Vault.op()`, so the app
   never sees a half-applied state.

## Where to put a change

| You want to…                                 | Go to                                                                                                                         | Also update                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Support a new piece of Markdown syntax       | `core/src/markdown/parse.ts` (metadata), `app/src/editor/ofm-syntax.ts` (editor), `app/src/markdown/render.ts` (reading view) | `editor/live-preview.ts` if it should render while typing       |
| Change how links resolve or are rewritten    | `core/src/links/resolver.ts`, `core/src/links/rewrite.ts`                                                                     | `core/src/vault.ts` only if the rename flow changes             |
| Add a file operation                         | `core/src/vault.ts` (inside `op()`), then `app/src/session.ts`                                                                | `app/src/ui/app-commands.ts` for a command                      |
| Add a command or a shortcut                  | `app/src/ui/app-commands.ts`                                                                                                  | `i18n.ts`, and the command list check in the recette            |
| Add a panel or a view                        | `app/src/ui/`, declared in `workspace/workspace.ts` (`ViewState`) or in `layout.ts` (margin tab)                              | `i18n.ts`, `styles/`, `DESIGN.md`                               |
| Add a per-vault setting                      | `app/src/settings.ts` (`VaultSettings`, defaults, Obsidian import)                                                            | `ui/SettingsView.tsx`, `i18n.ts`                                |
| Add a per-device preference                  | `app/src/settings.ts` (`Preferences`)                                                                                         | `ui/AppearanceSettings.tsx` or `LayoutSettings.tsx`             |
| Teach the app something only the host can do | `app/src/platform.ts`, then **both** hosts                                                                                    | `capabilities` when one host cannot do it                       |
| Change what two devices say to each other    | `sync/src/protocol.ts`, `sync/src/node.ts`                                                                                    | `docs/guide/sync.md`; mind compatibility with older versions    |
| Change what the server does                  | `apps/relay/src/`                                                                                                             | `docs/guide/accounts-and-relay.md`, `docs/RELAIS.md`, `deploy/` |

## Reading order

1. This document.
2. [vault-and-storage.md](vault-and-storage.md) — what a vault is and where its bytes live, per host.
3. [engine.md](engine.md) — parsing, the index, links, search, canvas.
4. [interface.md](interface.md) — session, workspace, settings, themes, the screens.
5. [editor-and-rendering.md](editor-and-rendering.md) — writing and reading a note.
6. [sync.md](sync.md) — one vault on several devices.
7. [accounts-and-relay.md](accounts-and-relay.md) — the server, and what it can and cannot know.
8. [security.md](security.md) — the trust boundaries, and the gaps we know about.
9. [testing-and-tooling.md](testing-and-tooling.md) — scripts, tests, journal, releases, CI.

## Running it

```bash
npm install
npm run dev:web        # http://localhost:5173
npm run dev:desktop    # Electron
npm run check          # formatting, types, unit tests, recette and journal checks
```

From VS Code's terminal, `ELECTRON_RUN_AS_NODE=1` is exported and the desktop scripts strip it; a
manual Electron launch must strip it too. The end-to-end suite drives Google Chrome (`CHROME_PATH`).
