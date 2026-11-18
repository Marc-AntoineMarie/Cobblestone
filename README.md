# Cobblestone

A local-first knowledge base built to replace Obsidian entirely: your notes stay plain Markdown files you own, and sharing, sync between your devices and live collaboration come built in, free for individuals.

> Cobblestone opens an existing Obsidian vault as-is. Same Markdown, same `[[links]]`, same folders. It keeps its own settings in `.cobblestone/` and never writes to `.obsidian/`, so switching costs nothing.

## Status

Early development (v0.1). What works today, on the desktop app and in the browser:

- **Vaults**: open any folder (desktop, or Chrome/Edge on the web), create a vault stored in the browser, or try the demo. The last vault reopens on launch. On the desktop, a vault whose folder was renamed or moved is found again, and notes and folders can be shown in the system's file manager.
- **Editor**: live preview that renders Markdown as you type (headings, emphasis, `==highlights==`, links, embeds, tasks you can tick, callouts, math, code, tables in source), plus a reading view and a source mode.
- **Obsidian Flavored Markdown**: wikilinks with headings, block ids and aliases, `![[embeds]]` of notes, sections, blocks, images, audio, video and PDFs, tags and nested tags, YAML properties, callouts, `%%comments%%`, KaTeX math, Mermaid diagrams, footnotes.
- **Links**: backlinks with context, outgoing links, pending links that create the note when followed, and link updates in every note when a file or folder is renamed or moved.
- **Finding things**: one field that finds notes by name, searches their text with Obsidian's query syntax (`tag:`, `path:`, `file:`, `line:()`, `section:()`, `task-todo:`, `[property:value]`, `OR`, `-`, `"phrases"`, `/regex/`), or creates the note; a command palette with shortcuts.
- **Obsidian's daily helpers**: bookmarks (imported from `.obsidian/bookmarks.json`), templates with `{{title}}`, `{{date}}` and `{{time}}`, previews of a link's target on hover, and unlinked mentions you can turn into links in one click.
- **Canvas**: Obsidian's `.canvas` files open and edit as they are (cards, notes, images, links, groups, labelled arrows, colours, undo), and an untouched canvas is never rewritten.
- **Views**: file tree with drag and drop, tags, outline, properties, graph (local and global, notes pin where you drop them), daily notes, tabs and split panes, settings.
- **Obsidian migration**: attachment folder, new note location, line breaks, trash, default view, text size and daily note settings are imported from `.obsidian/` the first time.
- **Two paper stocks**: day and night themes, following the system by default; text size and line length per vault. English and French.

- **Sync between your devices**: pair two devices with a code, end-to-end encrypted, over the local network or through a relay you can host yourself; optional accounts to find your devices from anywhere; cursors and presence when two devices write the same note. Sharing by link is the next milestone — see [docs/ROADMAP.md](docs/ROADMAP.md).

## Run it

Requires Node.js 22 or newer.

```bash
npm install
npm run dev:web        # web app on http://localhost:5173
npm run dev:desktop    # desktop app (Electron)
npm run check          # formatting, types and unit tests
npm run e2e            # end-to-end scenarios on the real desktop and web apps (uses Google Chrome)
npm run dist -w @cobblestone/desktop   # desktop installers into apps/desktop/release
```

> Running from VS Code's terminal: VS Code exports `ELECTRON_RUN_AS_NODE=1`, which would start Electron as plain Node. The desktop scripts remove it for you.

## Documentation

[docs/README.md](docs/README.md) is the map. To understand how the thing works, read
[docs/guide/](docs/guide/) — nine documents covering the vault and its storage, the engine, the
interface, the editor, sync, the relay, the security model and the tooling. Start with
[docs/guide/orientation.md](docs/guide/orientation.md).

## Contributing

How we work — rules, a journal entry for every change, and the list of ideas still to do — is in [contribution/](contribution/) (in French); [CONTRIBUTING.md](CONTRIBUTING.md) sums it up. Releases are listed in [CHANGELOG.md](CHANGELOG.md). Security issues: see [SECURITY.md](SECURITY.md).

## Repository

| Path                      | What it is                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`           | Runtime-independent engine: Markdown metadata parser, link resolution and rewriting, vault index, search.                                                             |
| `packages/node`           | File system storage for the desktop app and future server tools.                                                                                                      |
| `packages/app`            | The shared interface (React, CodeMirror 6): editor, reading view, workspace, views, styles.                                                                           |
| `apps/web`                | Web host: folders through the File System Access API, or the browser's private storage.                                                                               |
| `apps/desktop`            | Desktop host (Electron): sandboxed renderer, file access through a narrow IPC bridge.                                                                                 |
| `packages/sync`           | Sync between devices: the vault as a CRDT (Yjs), device identities, pairing, encrypted sessions.                                                                      |
| `apps/relay`              | The relay and the optional accounts (Node, WebSocket): a meeting point that only passes encrypted frames.                                                             |
| `docs/`                   | The map ([docs/README.md](docs/README.md)), the in-depth guide (`docs/guide/`), roadmap, architecture, distribution plan and the acceptance checklist (`RECETTE.md`). |
| `PRODUCT.md`, `DESIGN.md` | Product brief and design system.                                                                                                                                      |

## License

Cobblestone is free software under the [GNU Affero General Public License v3.0](LICENSE). Features for large organizations (single sign-on, provisioning, audit, retention) will be offered under a commercial license.
