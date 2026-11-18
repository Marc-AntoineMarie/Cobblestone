# The interface (`packages/app`)

One package holds the whole interface, and both hosts mount it. It is React with vanilla zustand
stores, CodeMirror 6 for writing and markdown-it for reading. Nothing here knows whether it runs in
a browser tab or in Electron: what it needs from the host comes through `Platform`.

## The spine: `Session`

`packages/app/src/session.ts` — one `Session` per open vault. It owns:

- `vault` (the engine's `Vault`) and `entry` (which vault, from the host's recent list);
- `workspace`: the store of panes, tabs and splits;
- `ui`: transient interface state (what to reveal, inline rename in progress, expanded folders,
  hover preview, toasts, the search field's text…);
- `settings`: the per-vault settings store, `bookmarks`, `recentFiles`;
- `commands`: the command registry;
- `sync`: the vault's `SyncController`;
- `platform`: the host.

It is also the place where **actions** live, so the components stay thin: `openPath`, `openLink`
(following a link to a note that does not exist creates it, like Obsidian), `createNote`,
`createCanvas`, `createFolder`, `rename`, `move`, `delete`, `duplicate`, `openDailyNote`,
`insertTemplate`, `toggleBookmark`, `revealInTree`, `openSettings`, `revealPanel`, `notify`/`fail`,
`resourceUrl` and attachment saving.

Two details worth knowing:

- **Saving is debounced and crash-proof.** `later(save, delay)` coalesces writes of the layout,
  settings and bookmarks; `flushSaves()` runs them all when the vault closes or the window goes
  away. `saveText` writes a note and, if the page is going away or the write fails, keeps the text
  synchronously in `localStorage` and writes it again at the next open — skipping notes that
  someone else changed meanwhile.
- **Tabs follow the files.** The session listens to the vault's rename and delete events and
  rewrites the workspace through `renamePaths` / `removePaths`.

## The workspace model (`workspace/workspace.ts`)

A pure, testable model — no React, no side effects. `WorkspaceState` is a tree of `Layout` nodes
(`pane`, or a `split` with a direction and sizes) holding `Pane`s of `Tab`s; each tab has a
`ViewState` (`note`, `canvas`, `file`, `graph`, `settings`, `empty`…), a mode (`live`, `source`,
`read`), its own history and a generation counter that makes views reload on navigation.

Every operation is a function from state to state: `open` (with `OpenTarget`: current tab, new tab,
split right, split down), `split`, `closeTab`, `activate`, `moveTab`, `togglePin`, `navigate`
(back/forward), `setMode`, `resizeSplit`, `renamePaths`, `removePaths`. `open` reuses a tab already
showing the file in the active pane, and the settings are a single place: opening them again returns
to their tab wherever it is.

## Screens

`ui/App.tsx` is the root: it loads preferences, opens the last vault, and shows either the
`Launcher` (no vault open) or the `Workbench`. The editor, the index and the renderers are behind a
`Suspense` boundary so the first screen stays light.

`ui/Workbench.tsx` picks the shape:

- **Desktop** (`DesktopWorkbench`): the list of notes on the left (`DeskList`), the notes in the
  middle (`NoteView`, `ReadingView`, `GraphView`, `FileView`, `SettingsView`…), the margin on the
  right (`Marge`: a rail of buttons, each opening one panel about the note — links, outline,
  properties, graph), plus the bars (`Bars`) and the floating layers (`Finder`, `ContextMenu`,
  `HoverPreview`, `Toasts`). Under 1000 px the list lies over the notes as a drawer.
- **Phone and touch tablet** (`MobileWorkbench`): one screen at a time. `ui/mobile-nav.ts` models
  it as a stack — home, then a note, then the note it links to — built on the active tab's history,
  with `MobileHome`, `MobileSearch`, `MobileNoteSheet` and `MobileKeyboardBar`. A tablet with a
  mouse gets the desktop workbench; a touch tablet gets the mobile one, split in two.

`ui/Finder.tsx` is the one field that finds notes by name or alias, searches their text, runs a
command, creates the note, or asks a question (`PickRequest`, used by templates).

Components read state with `useSession()` and `useStore(store, selector)` (`ui/hooks.ts`), never by
prop-drilling the session.

## Commands and shortcuts

`commands.ts` holds `CommandRegistry`, `Hotkey` parsing (`Mod` is Cmd on macOS, Ctrl elsewhere),
and matching that survives keyboard layouts (with Shift, letters and digits compare the physical
key). `ui/app-commands.ts` registers the app's commands: id, title, group, hotkey, an optional
`enabled()` and the action. A command shows up in the palette and in the keyboard shortcuts for
free. The recette has a section that walks every command, so a new one needs its line there.

## Settings, preferences, appearance

Two levels, deliberately:

- **`VaultSettings`** (`settings.ts`) — per vault, in `.cobblestone/app.json`: new-note folder,
  attachment folder (with Obsidian's `/`, `./`, `./sub` semantics), line breaks, line width, text
  size, trash behaviour, daily note folder and date format, templates folder, enabled CSS snippets.
  `loadVaultSettings` imports what it can from `.obsidian/` the first time, and never writes there.
- **`Preferences`** — per device, through `Platform.storage`: paper (day/night/system), the theme of
  each paper, custom themes and colour overrides, fonts, density, corners, language, and the
  `layout`.

`layout.ts` is the shape of the desktop workbench: ready-made layouts (`complet`, `lecture`,
`concentre`), the list and the margin, which rail buttons show and in which order, when tabs show,
the status bar, panel width. Changing one thing turns the layout `custom`; `normalizeLayout`
upgrades a layout stored by an older version.

`themes.ts` defines a theme as a handful of colour roles (paper, paper2, ink, ink2, accent, mark…);
every other ink the stylesheets use is **derived**, so a theme made in the settings is as complete
as a built-in one. `appearance.ts` turns the theme, fonts, density and corners into CSS custom
properties, applied to the page — and to a single element, which is how the settings show a live
preview. `snippets.ts` loads the vault's CSS snippets. Styles live in `styles/` (`tokens.css` first;
see [DESIGN.md](../../DESIGN.md), which the interface must respect or update).

## Text, errors, feedback

- `i18n.ts`: every visible string, English first, French beside it, placeholders as `{name}`. A key
  missing in one language is a check failure, not a runtime surprise.
- `errors.ts`: the hosts throw `cobblestone:<code>` errors (`vault-missing`, `permission-denied`,
  `app-data-folder`, `too-broad`…); this turns each code into a sentence the user can act on.
- `notify` / `fail` on the session put a `Toast` on screen (errors stay longer).

## Automatic updates (desktop)

`apps/desktop/src/main/updates.ts` checks GitHub releases at start and every hour, and
downloads a newer version in the background (`electron-updater`, `autoDownload: true`).
A pure function, `nextStatus`, turns each `autoUpdater` event into one `UpdateStatus`
(`idle` | `checking` | `up-to-date` | `downloading` | `ready` | `error`, defined in
`platform.ts` so the type is shared) — this is the only part with a unit test; the rest
needs a real GitHub release and an installed app, so it stays in the manual recette
(section 27).

The status is broadcast over IPC (`updates:status`) and reaches two components through
`Platform.updates` (`status`/`onStatus`/`check`/`install`):

- `ui/UpdateStatus.tsx`: a pill in the sidebar footer (`DeskList`), on the exact pattern
  of `SyncStatus` — a short state word, never a color alone, a popover with a "Check for
  updates" button (`check()`) and, once `ready`, a "Restart to update" button. This is
  how a user who dismissed the toast can still see the app is up to date, or get it to
  check again.
- `ui/UpdateReady.tsx`: the toast that appears once a version is `ready`, with the same
  restart action, plus "Later" (state stays `ready`, so the pill still shows it).

Both restart actions mount `ui/UpdateInstalling.tsx`: a full-screen, opaque notice shown
for ~900 ms before calling `install()` (`autoUpdater.quitAndInstall()`), so the freeze
and relaunch that follow read as an expected restart, not a crash. It records the target
version in `platform.storage` (`update.pendingVersion`) first; on the next launch,
`UpdateReady` compares that to the build's `__APP_VERSION__` (`SettingsView.tsx`'s
`VERSION`) and, on a match, shows a short "Updated: version … is now running." banner,
then clears the key.

## Adding to the interface

Keep the order: model first (a function in `workspace/` or a method on `Session`, with a unit test),
then the component, then the strings in `i18n.ts`, then the styles. A view that holds state the user
would expect to find again belongs in `Preferences` or `VaultSettings`, not in a component's
`useState`.
