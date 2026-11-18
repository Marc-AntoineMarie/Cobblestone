# Roadmap

The goal is a complete replacement for Obsidian, then everything Obsidian charges for or leaves to plugins, free for individuals. Organizations pay for the controls they need.

## 1. Foundation — done (first release: 0.1.0)

- Obsidian-compatible engine: metadata parser, link resolution with Obsidian's rules, rename with link updates, search with Obsidian's query syntax.
- Desktop (Electron) and web apps, each complete on its own.
- Live preview editor, reading view, source mode, embeds, callouts, math, diagrams.
- Backlinks, outgoing links, outline, properties, tags, graph, daily notes, tabs and splits, command palette.
- Import of `.obsidian/` settings; `.obsidian/` is never modified.
- Design system "The Community Print Shop" (see `DESIGN.md`), day and night paper, English and French.

## 2. Sync and sharing — under way

Priority: direct sync between your own devices, with no server holding your notes. How it works:
[guide/sync.md](guide/sync.md).

Done:

- ~~The vault as a CRDT (Yjs) bridged to the Markdown files, so edits from several devices merge without conflicts and the files stay the source of truth.~~
- ~~**Device-to-device sync**: pairing with a nine-symbol code (CPace), end-to-end encrypted sessions, over the local network (desktop) or through a relay (both hosts).~~
- ~~**Always-on relay**, self-hosted with one command (`deploy/relay`), which only passes encrypted frames and holds a sealed deposit for an offline device for 48 h at most.~~
- ~~**Optional accounts** on a relay, so a person's devices find each other from anywhere without the server being able to read anything.~~
- ~~**Writing together**: cursors and presence, each device in its own ink.~~

Still to come:

- **Sharing by link** for a note or a folder, with read, comment or edit rights.
- **WebRTC** to go direct when the network allows it, instead of through the relay.
- **Your own storage**: Git, S3, WebDAV, Dropbox, Google Drive.
- **Version history** for every note, browsable and restorable.
- Comments on notes.

## 3. Phones

Sync is what makes a phone useful: mobile browsers cannot open a folder, so notes reach the phone through it.

- ~~**Installable web app (PWA)** built from the web app: offline support, home screen icon, and an interface reworked for touch (one screen at a time, sheets, large targets, on-screen keyboard bar)~~ (done; the remaining mobile work is listed in `contribution/IDEES.md`).
- **Native apps** (Android, iOS) wrapping the same code with Capacitor, with real folders (shared storage on Android, the Files app on iOS).
- Channels and costs: see [DISTRIBUTION.md](DISTRIBUTION.md).

## 4. Full Obsidian parity

- ~~Canvas (JSON Canvas format, compatible with Obsidian's `.canvas` files), templates, bookmarks, hover previews, unlinked mentions~~ (done, in 0.1.0).
- Unique note creator, properties editor with types.
- Table editing, PDF viewer with annotations, audio recorder, slides, file recovery, workspaces.
- Customisable hotkeys, CSS snippets and themes, multiple windows.
- Importers from Notion, Evernote, Apple Notes, Logseq, Roam, Bear and Markdown folders.

## 5. Beyond Obsidian

- Queries over notes and properties (Dataview-style), compatible with Obsidian Bases (`.base`) files.
- Kanban boards, a tasks view across the vault, a calendar.
- Publishing a folder as a website, free.
- A plugin API, with a compatibility layer for the most popular Obsidian plugins.

## 6. Organizations (commercial)

- Single sign-on (SAML, OIDC) and SCIM provisioning.
- Roles and permissions across shared spaces, admin console.
- Audit logs, retention policies, legal hold.
- Dedicated hosting and service levels.
