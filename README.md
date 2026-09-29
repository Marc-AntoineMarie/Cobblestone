# Cobblestone

A local-first knowledge base built to replace Obsidian entirely: your notes stay plain Markdown files you own, and sharing, sync between your devices and live collaboration come built in, free for individuals.

> Cobblestone opens an existing Obsidian vault as-is. Same Markdown, same `[[links]]`, same folders. It keeps its own settings in `.cobblestone/` and never writes to `.obsidian/`, so switching costs nothing.

## Status

Early development (v0.1). What works today, on the desktop app and in the browser:

- **Vaults**: open any folder (desktop, or Chrome/Edge on the web), create a vault stored in the browser, or try the demo. The last vault reopens on launch.
- **Editor**: live preview that renders Markdown as you type (headings, emphasis, `==highlights==`, links, embeds, tasks you can tick, callouts, math, code, tables in source), plus a reading view and a source mode.
- **Obsidian Flavored Markdown**: wikilinks with headings, block ids and aliases, `![[embeds]]` of notes, sections, blocks, images, audio, video and PDFs, tags and nested tags, YAML properties, callouts, `%%comments%%`, KaTeX math, Mermaid diagrams, footnotes.
- **Links**: backlinks with context, outgoing links, pending links that create the note when followed, and link updates in every note when a file or folder is renamed or moved.
- **Finding things**: one field that finds notes by name, searches their text with Obsidian's query syntax (`tag:`, `path:`, `file:`, `line:()`, `section:()`, `task-todo:`, `[property:value]`, `OR`, `-`, `"phrases"`, `/regex/`), or creates the note; a command palette with shortcuts.
- **Views**: file tree with drag and drop, tags, outline, properties, graph (local and global, notes pin where you drop them), daily notes, tabs and split panes, settings.
- **Obsidian migration**: attachment folder, new note location, line breaks, trash, default view and daily note settings are imported from `.obsidian/` the first time.
- **Two paper stocks**: day and night themes, following the system by default. English and French.

Sync, sharing and collaboration are the next milestone. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Run it

Requires Node.js 22 or newer.

```bash
npm install
npm run dev:web       # web app on http://localhost:5173
npm run dev:desktop   # desktop app (Electron)
npm test              # unit tests
npm run typecheck
```

End-to-end checks against the real apps (they use the system Google Chrome):

```bash
npm run build -w @cobblestone/desktop && node scripts/e2e-desktop.mjs /tmp
npm run dev:web & node scripts/e2e-web.mjs /tmp
```

> Running from VS Code's terminal: VS Code exports `ELECTRON_RUN_AS_NODE=1`, which would start Electron as plain Node. The desktop scripts remove it for you.

## Repository

| Path                      | What it is                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/core`           | Runtime-independent engine: Markdown metadata parser, link resolution and rewriting, vault index, search. |
| `packages/node`           | File system storage for the desktop app and future server tools.                                          |
| `packages/app`            | The shared interface (React, CodeMirror 6): editor, reading view, workspace, views, styles.               |
| `apps/web`                | Web host: folders through the File System Access API, or the browser's private storage.                   |
| `apps/desktop`            | Desktop host (Electron): sandboxed renderer, file access through a narrow IPC bridge.                     |
| `docs/`                   | Roadmap and architecture.                                                                                 |
| `PRODUCT.md`, `DESIGN.md` | Product brief and design system.                                                                          |

## License

Cobblestone is free software under the [GNU Affero General Public License v3.0](LICENSE). Features for large organizations (single sign-on, provisioning, audit, retention) will be offered under a commercial license.
