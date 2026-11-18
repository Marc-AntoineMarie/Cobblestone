# Documentation map

Where everything is written down. Two audiences, two folders: **how the product works** here, **how
we work on it** in [../contribution/](../contribution/).

## Understanding the product

| Document                           | What it answers                                                            |
| ---------------------------------- | -------------------------------------------------------------------------- |
| [../README.md](../README.md)       | What Cobblestone is, what works today, how to run it                       |
| [../PRODUCT.md](../PRODUCT.md)     | What it is for, who for, and what it refuses to be                         |
| [ROADMAP.md](ROADMAP.md)           | What is done and what comes next, in order                                 |
| [../DESIGN.md](../DESIGN.md)       | The design system in place; any interface change respects it or updates it |
| [DISTRIBUTION.md](DISTRIBUTION.md) | How it reaches people: stores, installers, costs                           |

## Understanding the code — the guide

Start with [guide/orientation.md](guide/orientation.md): it names the pieces, the invariants, and
where a given kind of change goes.

| Document                                                       | What it covers                                                                                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [guide/orientation.md](guide/orientation.md)                   | Layers and what may depend on what, the invariants, where to put a change, reading order                                                                                              |
| [guide/vault-and-storage.md](guide/vault-and-storage.md)       | What a vault is, the adapter interface, the operation queue, renames with link updates — and exactly where the bytes live on each host, including what that means for confidentiality |
| [guide/engine.md](guide/engine.md)                             | Parsing a note, the metadata index, link resolution and rewriting, search, canvas                                                                                                     |
| [guide/interface.md](guide/interface.md)                       | `Session`, the workspace model, the screens, commands, settings and preferences, themes, i18n                                                                                         |
| [guide/editor-and-rendering.md](guide/editor-and-rendering.md) | CodeMirror and live preview, Obsidian Flavored Markdown, the reading view and its sanitising                                                                                          |
| [guide/sync.md](guide/sync.md)                                 | The CRDT, files as the truth, identities, sessions, pairing, transports, store-and-forward, writing together                                                                          |
| [guide/accounts-and-relay.md](guide/accounts-and-relay.md)     | The relay protocol and its limits, the accounts API, what the server can and cannot know                                                                                              |
| [guide/security.md](guide/security.md)                         | What we promise, the trust boundaries, the cryptographic inventory, the threats, the known gaps                                                                                       |
| [guide/testing-and-tooling.md](guide/testing-and-tooling.md)   | `npm run check`, unit tests, the recette, screenshots, the journal, releases, CI                                                                                                      |

[ARCHITECTURE.md](ARCHITECTURE.md) stays as the one-page map of the whole thing; the guide is the
same material in depth.

## Running it in production

| Document                         | What it covers                                           |
| -------------------------------- | -------------------------------------------------------- |
| [RELAIS.md](RELAIS.md)           | Installing the relay and hosting the web app on a server |
| [RECETTE.md](RECETTE.md)         | The acceptance checklist, run before every release       |
| [../SECURITY.md](../SECURITY.md) | Reporting a vulnerability                                |

## Working on it

| Document                                                   | What it covers                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| [../CONTRIBUTING.md](../CONTRIBUTING.md)                   | The short version, and the rights granted on a contribution |
| [../contribution/REGLES.md](../contribution/REGLES.md)     | The method: branches, commits, checks, journal, versions    |
| [../contribution/JOURNAL.md](../contribution/JOURNAL.md)   | Every merged change, with a card each                       |
| [../contribution/IDEES.md](../contribution/IDEES.md)       | Everything still to do or to decide                         |
| [../contribution/VERSIONS.md](../contribution/VERSIONS.md) | Version numbers, the CI, the release procedure              |
| [../CHANGELOG.md](../CHANGELOG.md)                         | What each published version brought                         |

## Keeping it true

Documentation that lags is worse than none: it makes someone confident and wrong. So a change that
alters how something works updates the guide page for it **in the same branch**, and its journal
card says so. The documents are written in English, like the code; the method documents in
`contribution/` are in French.
