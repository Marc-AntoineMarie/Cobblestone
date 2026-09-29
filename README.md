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
- **Obsidian's daily helpers**: bookmarks (imported from `.obsidian/bookmarks.json`), templates with `{{title}}`, `{{date}}` and `{{time}}`, previews of a link's target on hover, and unlinked mentions you can turn into links in one click.
- **Views**: file tree with drag and drop, tags, outline, properties, graph (local and global, notes pin where you drop them), daily notes, tabs and split panes, settings.
- **Obsidian migration**: attachment folder, new note location, line breaks, trash, default view and daily note settings are imported from `.obsidian/` the first time.
- **Two paper stocks**: day and night themes, following the system by default. English and French.

Sync, sharing and collaboration are the next milestone. See [docs/ROADMAP.md](docs/ROADMAP.md).

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

## Contributing

How we work — commit conventions, checks, versions and releases — is in [CONTRIBUTING.md](CONTRIBUTING.md). Changes are listed in [CHANGELOG.md](CHANGELOG.md). Security issues: see [SECURITY.md](SECURITY.md).

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
