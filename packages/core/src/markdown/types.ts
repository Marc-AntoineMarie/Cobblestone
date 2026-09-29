/** A range in a note: 0-based line of the start and absolute character offsets. */
export interface Loc {
  line: number;
  from: number;
  to: number;
}

export interface LinkRef extends Loc {
  /** "wiki" for [[target]], "markdown" for [text](target). */
  kind: 'wiki' | 'markdown';
  /** True for ![[embed]] and ![alt](image.png). */
  embed: boolean;
  /** Link path without subpath, decoded. "" means a link to the note itself. */
  target: string;
  /** "#Heading", "#Heading#Sub", "#^blockid" or "". */
  subpath: string;
  /** Alias ([[a|alias]]) or link text ([text](a)); for embeds, may hold a size like "300x200". */
  display: string | null;
  /** Exact source text of the whole link. */
  raw: string;
}

export interface HeadingRef extends Loc {
  level: number;
  text: string;
}

export interface TagRef extends Loc {
  /** Tag including the leading "#", as written: "#Project/Alpha". */
  tag: string;
}

export interface BlockRef {
  id: string;
  /** Line holding the "^id" marker. */
  line: number;
  /** Lines of the referenced block content (inclusive). */
  startLine: number;
  endLine: number;
}

export interface ListItemRef {
  line: number;
  /** Visual indentation (tab = 4 columns), used for nesting. */
  indent: number;
  /** Character between the brackets for tasks ("x", " ", "-", "/"...), null for plain items. */
  task: string | null;
  /** Line of the parent list item, null for top-level items. */
  parent: number | null;
  /** Item text after the marker and checkbox. */
  text: string;
}

export type SectionType =
  | 'yaml'
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'blockquote'
  | 'callout'
  | 'code'
  | 'math'
  | 'table'
  | 'thematicBreak'
  | 'html'
  | 'comment';

export interface SectionRef {
  type: SectionType;
  startLine: number;
  endLine: number;
}

export interface Frontmatter {
  /** Parsed properties; {} when the YAML is invalid. */
  data: Record<string, unknown>;
  /** YAML source between the "---" fences. */
  raw: string;
  startLine: number;
  endLine: number;
  error: string | null;
}

export interface FrontmatterLinkRef {
  /** Property holding the link, e.g. "related" or "related.0". */
  key: string;
  target: string;
  subpath: string;
  display: string | null;
  raw: string;
}

export interface NoteMetadata {
  frontmatter: Frontmatter | null;
  headings: HeadingRef[];
  /** Links and embeds in the body, in document order. */
  links: LinkRef[];
  /** Links written as property values ("[[Note]]" strings in the frontmatter). */
  frontmatterLinks: FrontmatterLinkRef[];
  /** Tags from the body and from the "tags" property, normalized with a leading "#". */
  tags: TagRef[];
  /** All tags of the note, deduplicated, "#tag" form, original case. */
  allTags: string[];
  aliases: string[];
  blocks: Record<string, BlockRef>;
  listItems: ListItemRef[];
  sections: SectionRef[];
}
