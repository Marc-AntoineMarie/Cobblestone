# Tests, scripts and release

Three layers of verification, and a handful of scripts that keep the repository honest. The rules
around them (what must pass before a commit, before a merge, before a release) are in
[../../contribution/REGLES.md](../../contribution/REGLES.md); this document says how the machinery
works.

## `npm run check` — the gate before every commit

```
npm run check = format:check + typecheck + test + recette + journal
```

- **`format:check`** — Prettier over the whole repository (`singleQuote`, `printWidth: 130`).
- **`typecheck`** — `tsc` once per package, in order: `core`, `sync`, `relay`, `node`, `app`, `web`,
  `desktop`, `tests`. One project per package is what keeps `core` free of DOM and Node types.
- **`test`** — Vitest, Node environment, `packages/*/src/**/*.test.ts` and
  `apps/*/src/**/*.test.ts`. Unit tests only: fast, no browser, no Electron. This is where the
  engine, the workspace model, the CRDT, the sessions and the pairing are covered.
- **`recette`** — `scripts/recette.mjs`: checks that `docs/RECETTE.md` is well formed, that every
  line has a test on each platform it names, and that the statuses match reality.
- **`journal`** — `scripts/journal.mjs`: checks the journal entries and that **every merged branch
  has one**.

A bug fix arrives with its test. If a change has no unit-testable surface, say so in the journal
entry.

## The recette — the end-to-end acceptance checklist

[`docs/RECETTE.md`](../RECETTE.md) is the list of everything to verify before a release, in French,
one line per check: an identifier, the platforms it applies to (Bureau, Web or both), its status,
the action and the expected result.

| Status          | Who runs it                                         |
| --------------- | --------------------------------------------------- |
| `auto`          | `npm run e2e` (Playwright, `tests/recette/`)        |
| `ci`            | the continuous integration, on every push           |
| `manuel`        | a person — the line says why a machine cannot do it |
| `à automatiser` | a person, until its test is written                 |

`tests/recette/` holds one spec file per section (`01-preparation`, …, `32-telephone`). Playwright
has two projects: **`bureau`** drives the real Electron app, **`web`** drives the built web app in
Google Chrome (`CHROME_PATH`, default `/usr/bin/google-chrome`); each test carries the tags of the
platforms its line names. Two workers by default, because every test runs a whole app
(`RECETTE_WORKERS=4` on a large machine). Results land in `test-results/recette.md`.

```bash
npm run e2e                                  # everything (~20 min)
npm run e2e -- tests/recette/24 tests/recette/25   # only the sections touched
npm run recette -- sync                      # rewrite the statuses from the tests
```

Run the sections your change affects; run the whole suite only when a shared foundation moves
(layout, shared styles, `packages/core`, storage) and before a release.

**A new or changed checklist line ships in the same change as its test** — automated, or `manuel`
with the reason. A bug the recette finds gets a `fix` commit that cites the line.

## Screenshots

`node scripts/shoot.mjs <out-dir> [steps…]` serves the built web app and photographs it (sizes,
light and dark paper, languages) for visual review; `scripts/shoot-desktop.mjs` does the same for
Electron. Use them for any interface change, and look at the result.

## The journal

Every merged change has a card in `contribution/journal/`: why, what was added, modified, removed,
and how it was tested.

```bash
npm run journal -- new              # draft the entry of the current branch from git
npm run journal -- new --merge SHA  # draft one for a branch already merged
npm run journal -- index            # rewrite contribution/JOURNAL.md
npm run journal                     # check (part of npm run check)
```

The card is the project's memory: the git history says what changed, the card says why. Ideas and
decisions not yet done live in `contribution/IDEES.md` — an idea leaves it when it ships.

## Releases

`npm run release X.Y.Z` (`scripts/release.mjs`), from `main`: checks the working tree, the tests and
the automated recette, writes the version into every `package.json` and into the unpublished journal
cards, completes `CHANGELOG.md` from the commits, makes the `chore(release): vX.Y.Z` commit and the
annotated tag, and pushes them. `--no-push` prepares everything without pushing; `--sans-recette`
skips the recette (urgent fix only). The tag triggers the release workflow. Full procedure:
[../../contribution/VERSIONS.md](../../contribution/VERSIONS.md). An audit
(`docs/audit-YYYY-MM-DD.md`) precedes each minor version.

## Continuous integration (`.github/workflows/`)

| Workflow          | When                        | What it does                                                                                                     |
| ----------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `ci.yml`          | every push and pull request | `format:check`, `typecheck`, `test`, builds web and desktop; and `npm audit --omit=dev --audit-level=high`       |
| `recette.yml`     | scheduled and on demand     | the full Playwright suite on both projects under `xvfb`, with the recette report and failure traces as artifacts |
| `deploy.yml`      | push to `main`              | builds the web app, rsyncs it to the VPS, pulls and restarts the relay's container (SSH on port 4025)            |
| `main-builds.yml` | push to `main`              | a test version: desktop installers for each OS                                                                   |
| `release.yml`     | a `vX.Y.Z` tag              | draft release from the CHANGELOG, then the desktop builds                                                        |

## Local quirks

- VS Code's terminal exports `ELECTRON_RUN_AS_NODE=1`, which would start Electron as plain Node. The
  desktop scripts strip it; strip it for any manual Electron launch too.
- `COBBLESTONE_USER_DATA` moves the desktop app's data folder — how the end-to-end tests stay
  isolated from a real installation.
- `COBBLESTONE_DEV_SERVER` points the Electron renderer at the Vite dev server.
