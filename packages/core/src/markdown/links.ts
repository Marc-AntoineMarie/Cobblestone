/** Splits "Note#Heading" / "Note#^block" into target and subpath (subpath keeps its "#"). */
export function splitSubpath(link: string): { target: string; subpath: string } {
  const i = link.indexOf('#');
  if (i === -1) return { target: link, subpath: '' };
  return { target: link.slice(0, i), subpath: link.slice(i) };
}

/**
 * Parses the inside of a wikilink: "Folder/Note#Heading|Alias".
 * In tables the alias pipe is escaped ("\|"), which is accepted too.
 */
export function parseWikiInner(inner: string): { target: string; subpath: string; display: string | null } {
  const unescaped = inner.replace(/\\\|/g, '|');
  const pipe = unescaped.indexOf('|');
  const link = pipe === -1 ? unescaped : unescaped.slice(0, pipe);
  const display = pipe === -1 ? null : unescaped.slice(pipe + 1);
  const { target, subpath } = splitSubpath(link);
  return { target: target.trim(), subpath: subpath.trim(), display };
}

/** Parsed subpath: heading chain or block id. */
export type Subpath = { type: 'heading'; headings: string[] } | { type: 'block'; id: string } | null;

export function parseSubpath(subpath: string): Subpath {
  if (!subpath || subpath === '#') return null;
  const body = subpath.startsWith('#') ? subpath.slice(1) : subpath;
  if (body.startsWith('^')) return { type: 'block', id: body.slice(1) };
  const headings = body.split('#').map((h) => h.trim()).filter(Boolean);
  return headings.length ? { type: 'heading', headings } : null;
}

/**
 * Normalizes heading text the way Obsidian compares it in links: characters
 * that cannot appear in a link are replaced by spaces, whitespace collapsed,
 * case ignored.
 */
export function normalizeHeading(text: string): string {
  return text
    .replace(/[#|^:%[\]\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Parses an embed size "300" or "300x200" written as display text. */
export function parseEmbedSize(display: string | null): { width?: number; height?: number } | null {
  if (!display) return null;
  const m = /^\s*(\d+)(?:\s*x\s*(\d+))?\s*$/.exec(display);
  if (!m) return null;
  return m[2] ? { width: Number(m[1]), height: Number(m[2]) } : { width: Number(m[1]) };
}
