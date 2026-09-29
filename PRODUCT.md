# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Delivered as a desktop app (Electron) and a web app from one codebase. Each must be fully usable on its own, sharing included; mobile comes later.

## Users

Three audiences, all first-class in v1:

- **People migrating from Obsidian.** Daily note-takers who already think in `[[links]]`, backlinks, graphs and keyboard shortcuts. They leave because sharing is missing and sync, publishing and history are paid or plugin-only.
- **The general public.** People who have never used a networked note tool and must succeed without learning a system first.
- **Teams and organizations.** Groups sharing a knowledge base with permissions. They are the paying customers.

## Product Purpose

Cobblestone is a local-first knowledge base meant to fully replace Obsidian, not accompany it. Notes stay plain Markdown files the user owns. Sharing, real-time collaboration, sync between devices, publishing and version history are built in and free for individuals. Success means a person can open their existing Obsidian vault, switch, and never need Obsidian again.

## Positioning

The only tool combining plain local Markdown files, fully compatible with Obsidian vaults, with free device-to-device sync that needs no server, plus built-in sharing and live collaboration. Obsidian keeps its files local but charges for sync and has no sharing. Notion and Google Docs share but lock the content in their cloud.

## Operating Context

- Long daily sessions of writing, linking and navigating notes. Keyboard-heavy for power users, pointer-driven for newcomers.
- Vaults range from a handful of notes to tens of thousands of files, with attachments (images, PDFs, audio, video) and canvases.
- The same person moves between desktop and browser, and between their own devices.
- Notes are shared with other people through links with read, comment and edit rights, and edited simultaneously.

## Capabilities and Constraints

- File format compatibility with Obsidian: Obsidian Flavored Markdown (wikilinks, embeds, block ids, callouts, properties/YAML frontmatter, tags), JSON Canvas, the `.trash` folder, and importing `.obsidian/` settings. Cobblestone's own config lives in `.cobblestone/` and it never writes to `.obsidian/`.
- The interface is designed freely: it does not copy Obsidian's layout or look. Only the files stay compatible.
- Sync priority: device-to-device (P2P). Self-hosting (Docker), a hosted cloud with a free quota, and bring-your-own storage (Git, S3, WebDAV, Dropbox, Drive) must also be available and easy to set up.
- License: open-core under AGPL-3.0. Enterprise features (SSO/SAML, SCIM, roles, audit, retention, SLA) are commercial.
- Built in by default, where Obsidian charges or needs plugins: sync, publishing, version history, collaboration, sharing with permissions, database-style queries, Kanban, tasks, calendar and daily notes.
- Undecided: pricing, hosted-cloud quotas, plugin API shape, mobile timeline.

## Brand Commitments

- Name: Cobblestone.
- The user rejects four failure modes, polished or not: overloaded (panels and buttons everywhere instead of an interface that recedes behind writing), cold (a developer tool instead of a pleasant place to write), an Obsidian look-alike, and gimmicky (effects that slow work down).

## Evidence on Hand

None yet: no users, testimonials, benchmarks or pricing. Nothing of the kind may be invented. Demo vault content must be clearly sample material.

## Product Principles

1. **Your files, always.** Everything is readable Markdown on disk; no feature may trap content in a proprietary format.
2. **Free for people, paid by organizations.** Individual features never sit behind a paywall; enterprise controls are what's sold.
3. **Calm by default, powerful on demand.** A newcomer sees a writing surface; power and density appear when asked for, never all at once.
4. **Each surface stands alone.** Desktop and web are each complete, and they work together without depending on each other.
5. **Switching must be painless.** An Obsidian vault opens as-is, with nothing to convert and nothing to lose.
