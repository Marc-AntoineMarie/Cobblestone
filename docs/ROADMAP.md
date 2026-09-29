# Roadmap

The goal is a complete replacement for Obsidian, then everything Obsidian charges for or leaves to plugins, free for individuals. Organizations pay for the controls they need.

## 1. Foundation — done (v0.1)

- Obsidian-compatible engine: metadata parser, link resolution with Obsidian's rules, rename with link updates, search with Obsidian's query syntax.
- Desktop (Electron) and web apps, each complete on its own.
- Live preview editor, reading view, source mode, embeds, callouts, math, diagrams.
- Backlinks, outgoing links, outline, properties, tags, graph, daily notes, tabs and splits, command palette.
- Import of `.obsidian/` settings; `.obsidian/` is never modified.
- Design system "The Community Print Shop" (see `DESIGN.md`), day and night paper, English and French.

## 2. Sync and sharing — next

Priority: direct sync between your own devices, with no server holding your notes.

- Every note becomes a CRDT document (Yjs) bridged to its Markdown file, so edits from several devices or people merge without conflicts, and the file on disk stays the source of truth.
- **Device-to-device sync** over WebRTC. Devices pair with a code or QR code; everything is end-to-end encrypted. A tiny signaling service connects peers and can be self-hosted.
- **Sharing by link** for a note or a folder, with read, comment or edit rights. Collaborators appear with their own ink colour, cursors and presence.
- **Always-on relay** so shares keep working when your devices are off: self-hosted (Docker, one command) or the Cobblestone cloud with a free quota. The relay only stores encrypted data.
- **Your own storage**: Git, S3, WebDAV, Dropbox, Google Drive.
- **Version history** for every note, browsable and restorable.
- Comments on notes.

## 3. Full Obsidian parity

- Canvas (JSON Canvas format, compatible with Obsidian's `.canvas` files).
- ~~Templates, bookmarks, hover previews, unlinked mentions~~ (done in 0.2).
- Unique note creator, properties editor with types.
- Table editing, PDF viewer with annotations, audio recorder, slides, file recovery, workspaces.
- Customisable hotkeys, CSS snippets and themes, multiple windows.
- Importers from Notion, Evernote, Apple Notes, Logseq, Roam, Bear and Markdown folders.

## 4. Beyond Obsidian

- Queries over notes and properties (Dataview-style), compatible with Obsidian Bases (`.base`) files.
- Kanban boards, a tasks view across the vault, a calendar.
- Publishing a folder as a website, free.
- A plugin API, with a compatibility layer for the most popular Obsidian plugins.
- Mobile apps (iOS and Android).

## 5. Organizations (commercial)

- Single sign-on (SAML, OIDC) and SCIM provisioning.
- Roles and permissions across shared spaces, admin console.
- Audit logs, retention policies, legal hold.
- Dedicated hosting and service levels.
