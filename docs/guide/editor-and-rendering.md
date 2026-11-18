# Writing and reading a note

Two separate engines serve one note: CodeMirror 6 for the writing modes (live preview and source),
markdown-it for the reading view. They share the vault's index, the same link resolution and the
same stylesheet, which is why a note looks the same in all three modes.

## The editor (`packages/app/src/editor/`)

`setup.ts` builds the editor state: history, selection and drop cursor, bracket matching, in-editor
search, selection-match highlighting, autocompletion, the Markdown language with our Obsidian
extensions, syntax highlighting, the attachment handlers (paste and drop a file into a note), the
mode extension and spellchecking. Token classes come from a `HighlightStyle` (`tok-heading`,
`tok-link`…) and the colours live in the stylesheet, so both paper stocks theme them.

`ofm-syntax.ts` teaches the Lezer Markdown parser Obsidian Flavored Markdown: `[[wikilinks]]` and
`![[embeds]]`, `#tags`, `==highlights==`, `%%comments%%`, `$math$`, `^block-ids` and YAML
frontmatter. The node names it defines are what the live preview looks for, so adding syntax means
adding a node here first.

`live-preview.ts` is the heart of the writing experience: Markdown renders as you type. It decorates
the document and **hides the syntax marks except on the lines the selection touches** (while the
editor has focus), so the text reads like the finished page but edits like plain Markdown. Widgets
(`widgets.ts`) replace what cannot be a decoration: checkboxes you can tick, list bullets, rendered
math, callout badges, embedded notes and attachments, and the frontmatter shown as a list of
properties that a click turns back into source.

`completion.ts` offers link completion inside `[[` — notes, aliases, headings, block ids — and tags.
What the editor needs from the app is behind one interface, `host.ts` (`EditorHost`): resolve a
target, follow a link, open a tag, show a hover preview, hand over an attachment URL, render an
embed, list completion candidates. The editor never reaches into the session directly.

`commands.ts` holds the text operations, each a pure-ish function over the view: `toggleWrap`
(bold, italic, highlight, strikethrough, code), `insertWikiLink`, `toggleTask`, `cycleHeading` /
`setHeadingLevel`, `toggleBullet`, `insertTable`, `insertText`. They serve both the keyboard
shortcuts and the note's formatting bar (`ui/NoteToolbar.tsx`), so a formatting feature is written
once.

`collab.ts` is the bridge to sync: when the vault syncs, the editor works on the note's shared
`Y.Text` — each keystroke goes into it (and out to the other devices), remote edits arrive as
CodeMirror changes, and other devices' cursors show at their names in their own ink. The file is
still saved as before. See [sync.md](sync.md).

## The reading view (`markdown/render.ts`, `ui/render-note.ts`)

`renderMarkdown(text, options)` produces HTML from markdown-it plus our extensions: wikilinks and
embeds, tags, highlights, comments, callouts, footnotes, math placeholders, Mermaid blocks,
checkboxes, and `breaks` following the vault's "strict line breaks" setting. It emits **data
attributes rather than resolved links**: it does not know the vault.

`ui/render-note.ts` is the second half. It:

1. runs the HTML through **`sanitize`** (DOMPurify) — always, no exception, because a note can come
   from a share or from another device;
2. resolves link targets against the index, marking unresolved ones;
3. loads attachments through `session.resourceUrl` (images, audio, video, PDF);
4. transcludes embedded notes, sections and blocks, with a depth limit and cycle detection
   (`MAX_DEPTH`, `ancestors`);
5. renders math with KaTeX and diagrams with Mermaid, both loaded on first use (`katex.ts`) because
   they are large; the rendered SVG is sanitised again with the SVG profile.

`ui/preview.ts` reuses the same pipeline for the hover preview of a link's target.

**The rule:** nothing from a note reaches the DOM without passing `sanitize`. If you add a renderer
that writes HTML or SVG, it sanitises its own output, and the recette's security section
(`tests/recette/28-securite.spec.ts`) gets a line for it.

## Modes

`EditorMode` is `live`, `source` or `read`, per tab (`workspace/workspace.ts`). Live and source are
the same CodeMirror state with the live-preview extension switched off; `read` is the markdown-it
pipeline. The phone opens notes in reading mode first.
