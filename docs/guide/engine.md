# The engine (`packages/core`)

The engine turns a folder of files into something the interface can query: what each note contains,
what links to what, which tags exist, what matches a search. It runs in any JavaScript runtime — no
DOM, no Node — which is why it is also the part covered best by unit tests.

Public surface: `packages/core/src/index.ts`. Everything below is exported from there.

## Parsing a note (`markdown/parse.ts`)

`parseMarkdown(text)` returns a `NoteMetadata` (`markdown/types.ts`). It **does not render**: it
finds the structure the app needs for linking, search and navigation.

- `frontmatter`: parsed YAML properties, the raw source, its line range, and a parse error when the
  YAML is invalid (properties then come back empty rather than failing).
- `headings`, `links`, `frontmatterLinks`, `tags`, `allTags`, `aliases`, `blocks` (`^block-id` with
  the line range of the block it marks), `listItems` (indentation, nesting, task character),
  `sections` (yaml, heading, paragraph, list, blockquote, callout, code, math, table, rule, html,
  comment).
- Every reference carries a `Loc`: line, and absolute `from`/`to` offsets in the source.

The trick that makes it reliable: the parser works over a **masked** copy of the text in which
everything that must not be indexed — fenced and inline code, math, `%%comments%%`, escapes — is
replaced by spaces. Offsets and line numbers therefore match the original exactly, so the editor can
decorate, and search can highlight, using the same numbers. When you add syntax, mask first.

`LinkRef` keeps the link's exact source text (`raw`), its kind (`wiki` or `markdown`), whether it is
an embed, its `target`, its `subpath` (`#Heading`, `#Heading#Sub`, `#^blockid`) and its `display`
(alias, link text, or an embed size like `300x200`). That is enough to rewrite a link without
changing its style.

## Resolving links (`links/resolver.ts`)

`LinkResolver.resolve(linkpath, sourcePath)` follows Obsidian's rules, in order:

1. exact path from the vault root (`Folder/Note`);
2. relative to the linking note's folder (`./Note`, `../Other/Note`, `Sub/Note`);
3. any file whose path ends with the link path — ties prefer the linking note's folder, then the
   shortest path, then alphabetical order.

Matching ignores case, and `.md` may be omitted. `linkText(target, source, format)` produces the
text to write for a new link, including Obsidian's "shortest path when possible": the bare name only
when it is unique in the vault.

`links/rewrite.ts` rebuilds a link for a new target while keeping its format, alias and subpath, and
`applyEdits` applies non-overlapping edits to a text. `links/mentions.ts` finds plain-text mentions
of a note's name or aliases — whole words, any case, outside links, code, comments and properties —
which is what the "unlinked mentions" panel turns into links.

## The index (`metadata-cache.ts`)

`MetadataCache` holds, for the whole vault: parsed metadata per note, resolved links
(source → destination → count), unresolved links, backlinks, tags with counts (a nested `#a/b` also
counts for `#a`), and aliases. The graph view, the backlinks panel, the tag panel and
autocompletion all read it.

It is maintained **incrementally** by `Vault`: `setContent` reparses one note and re-resolves its
links; adding, renaming or removing a file re-resolves only the notes whose links could resolve
differently — found through a `linkKey` index (lowercased file name) rather than by rescanning the
vault. `getBacklinks(path)` returns each source with the matching links, body and property links
apart, so the panel can show context.

Events: `changed` (a note was reparsed) and `resolved` (link resolution changed for a set of notes).

## Search (`search/`)

`search/query.ts` parses Obsidian's query language into a `QueryNode` tree:

```
word  "exact phrase"  /regex/  -excluded  a OR b  (grouping)
file: path: content: tag:
line:(…) block:(…) section:(…) task: task-todo: task-done:
match-case: ignore-case:
[property]  [property:value]
```

Terms separated by spaces are ANDed. `search/search.ts` evaluates the tree over `SearchDocument`s
(path, content, optional metadata) and returns, per file, the match offsets with their line numbers,
whether the name matched, and a score for ordering. The scoped operators are what make the language
useful: `line:(a b)` wants both terms on one line, `section:(…)` inside one section, `task-todo:(…)`
in an unchecked task.

## Canvas (`canvas.ts`)

JSON Canvas 1.0 — the format of Obsidian's `.canvas` files. `parseCanvas` drops malformed entries
(a broken file opens empty rather than failing), **keeps unknown fields untouched**, and
`serializeCanvas` writes it back the way Obsidian does, tabs included, so saving an unchanged canvas
produces a byte-identical file. `canvasReferences` lists the files a canvas shows, and
`renameCanvasReferences` repoints them after a rename — which is how `Vault.rename` keeps canvases
in step.

## Where to be careful

- Offsets are a contract. Anything that produces or consumes a `Loc` must agree with the parser's
  masking, or decorations land one character off.
- The index is incremental. When a new kind of reference can change how links resolve, the
  invalidation set in `metadata-cache.ts` has to learn about it too.
- `core` must keep compiling without DOM or Node types. `npm run typecheck` checks that per package,
  which is why the project has one `tsconfig` per package rather than one at the root.
