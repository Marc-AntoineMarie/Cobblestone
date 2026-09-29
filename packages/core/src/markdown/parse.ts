import { parse as parseYaml } from 'yaml';
import type {
  BlockRef,
  Frontmatter,
  FrontmatterLinkRef,
  HeadingRef,
  LinkRef,
  ListItemRef,
  NoteMetadata,
  SectionRef,
  SectionType,
  TagRef,
} from './types';
import { parseWikiInner, splitSubpath } from './links';

/*
 * Parser for Obsidian Flavored Markdown metadata. It does not render
 * anything: it finds the structure the app needs for linking, search and
 * navigation (links, embeds, tags, headings, block ids, tasks, properties).
 *
 * It works in passes over a "masked" copy of the text where everything that
 * must not be indexed (code, math, comments, escapes) is replaced by spaces,
 * so offsets and line numbers stay identical to the source.
 */

type AtomicKind = 'yaml' | 'code' | 'math' | 'comment';

const QUOTE_PREFIX = /^(?:[ \t]{0,3}>[ \t]?)*/;
const FENCE_OPEN = /^[ \t]{0,3}(`{3,}|~{3,})(.*)$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+|$)/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const LIST_ITEM = /^((?:[ \t]{0,3}>[ \t]?)*)([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+|$)(?:\[(.)\](?=[ \t]|$))?/;
const TABLE_DELIMITER = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const HTML_START = /^ {0,3}<[a-zA-Z!/]/;
const BLOCK_ID = /(?:^|[ \t])\^([A-Za-z0-9-]+)[ \t]*$/;
const WIKILINK = /(!?)\[\[([^[\]\n]*?)\]\]/g;
const MD_LINK =
  /(!?)\[((?:[^[\]\n]|\\[[\]])*)\]\([ \t]*(<[^<>\n]*>|[^\s()<>]*(?:\([^\s()]*\)[^\s()<>]*)*)(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'))?[ \t]*\)/g;
const TAG = /(?<![^\s])#([\p{L}\p{N}\p{M}_\-/\p{Extended_Pictographic}‍️]+)/gu;
const URL_SCHEME = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export function parseMarkdown(text: string): NoteMetadata {
  const rawLines = text.split('\n');
  const lines = rawLines.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  const lineStarts: number[] = [];
  let offset = 0;
  for (const raw of rawLines) {
    lineStarts.push(offset);
    offset += raw.length + 1;
  }

  // Pass 1: block-level atoms (frontmatter, fenced code, math, comments).
  const lineKind: (AtomicKind | null)[] = new Array(lines.length).fill(null);
  const atomId: number[] = new Array(lines.length).fill(-1);
  const frontmatter = scanBlocks(lines, lineKind, atomId);

  // A trailing "\r" becomes a space so masked offsets match the source.
  const masked = lines.map((line, i) => (lineKind[i] ? blank(line) : line) + (rawLines[i]!.length > line.length ? ' ' : ''));

  // Pass 2: inline atoms (escapes, code spans, inline math, inline comments).
  const inlineMasked = maskInline(masked.join('\n')).split('\n');

  const lineOf = (pos: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid]! <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  // Pass 3: inline structures on the masked text.
  let scan = inlineMasked.join('\n');
  const links: LinkRef[] = [];
  for (const m of scan.matchAll(WIKILINK)) {
    const from = m.index;
    const to = from + m[0].length;
    const raw = text.slice(from, to);
    const embed = m[1] === '!';
    const inner = raw.slice(embed ? 3 : 2, -2);
    if (inner.trim() === '') continue;
    const parsed = parseWikiInner(inner);
    links.push({ kind: 'wiki', embed, ...parsed, raw, from, to, line: lineOf(from) });
  }
  scan = maskRanges(scan, links);

  const mdLinks: LinkRef[] = [];
  for (const m of scan.matchAll(MD_LINK)) {
    const from = m.index;
    const to = from + m[0].length;
    const raw = text.slice(from, to);
    let dest = m[3]!;
    if (dest.startsWith('<')) dest = dest.slice(1, -1);
    if (dest === '' || URL_SCHEME.test(dest)) continue;
    let decoded = dest;
    try {
      decoded = decodeURI(dest);
    } catch {
      // Keep malformed percent-escapes as written.
    }
    const { target, subpath } = splitSubpath(decoded);
    const label = raw.slice(m[1]!.length + 1, raw.indexOf('](', m[1]!.length));
    mdLinks.push({
      kind: 'markdown',
      embed: m[1] === '!',
      target: target.trim(),
      subpath,
      display: label === '' ? null : label,
      raw,
      from,
      to,
      line: lineOf(from),
    });
  }
  scan = maskRanges(scan, mdLinks);
  links.push(...mdLinks);
  links.sort((a, b) => a.from - b.from);

  const tags: TagRef[] = [];
  for (const m of scan.matchAll(TAG)) {
    const name = m[1]!.replace(/\/+$/, '');
    if (!isValidTagName(name)) continue;
    const from = m.index;
    tags.push({ tag: '#' + name, from, to: from + 1 + name.length, line: lineOf(from) });
  }

  // Line-level structures.
  const structureLines = scan.split('\n');
  const headings: HeadingRef[] = [];
  const listItems: ListItemRef[] = [];
  const listStack: { indent: number; line: number }[] = [];
  const blockIdLines: { id: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = structureLines[i]!;
    if (lineKind[i]) continue;

    const heading = HEADING.exec(line);
    if (heading) {
      const original = lines[i]!;
      const headingText = original
        .replace(/^ {0,3}#{1,6}(?:[ \t]+|$)/, '')
        .replace(/(?:^|[ \t]+)#+[ \t]*$/, '')
        .trim();
      headings.push({
        level: heading[1]!.length,
        text: headingText,
        line: i,
        from: lineStarts[i]!,
        to: lineStarts[i]! + original.length,
      });
      listStack.length = 0;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const indent = visualWidth(item[2]!);
      while (listStack.length && listStack[listStack.length - 1]!.indent >= indent) listStack.pop();
      const text = lines[i]!.slice(item[0].length).trim();
      listItems.push({
        line: i,
        indent,
        task: item[5] ?? null,
        parent: listStack.length ? listStack[listStack.length - 1]!.line : null,
        text,
      });
      listStack.push({ indent, line: i });
    } else if (line.trim() !== '' && !/^[ \t]/.test(line)) {
      // A non-indented, non-list line ends the current list.
      listStack.length = 0;
    }

    const blockId = BLOCK_ID.exec(line);
    if (blockId) blockIdLines.push({ id: blockId[1]!, line: i });
  }

  const sections = buildSections(structureLines, lineKind, atomId);
  const blocks: Record<string, BlockRef> = {};
  for (const { id, line } of blockIdLines) {
    blocks[id.toLowerCase()] = resolveBlock(id, line, structureLines, sections, listItems);
  }

  // Properties.
  const aliases: string[] = [];
  const frontmatterLinks: FrontmatterLinkRef[] = [];
  const propertyTags: TagRef[] = [];
  if (frontmatter) {
    const data = frontmatter.data;
    for (const tag of toStringList(data.tags ?? data.tag, /[,\s]+/)) {
      const name = tag.replace(/^#/, '');
      if (isValidTagName(name)) propertyTags.push({ tag: '#' + name, line: 0, from: 0, to: 0 });
    }
    aliases.push(...toStringList(data.aliases ?? data.alias, null));
    collectFrontmatterLinks(data, '', frontmatterLinks);
  }

  const seen = new Set<string>();
  const allTags: string[] = [];
  for (const { tag } of [...propertyTags, ...tags]) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    allTags.push(tag);
  }

  return {
    frontmatter,
    headings,
    links,
    frontmatterLinks,
    tags: [...propertyTags, ...tags],
    allTags,
    aliases,
    blocks,
    listItems,
    sections,
  };
}

/** Tags need at least one non-digit character: "#1984" is not a tag, "#y1984" is. */
export function isValidTagName(name: string): boolean {
  return name !== '' && !/^[\p{N}]+$/u.test(name) && !/^[/]/.test(name);
}

function scanBlocks(lines: string[], lineKind: (AtomicKind | null)[], atomId: number[]): Frontmatter | null {
  let frontmatter: Frontmatter | null = null;
  let atom = 0;
  let i = 0;

  if (lines[0]?.trimEnd() === '---') {
    const end = lines.findIndex((l, idx) => idx > 0 && /^(?:---|\.\.\.)[ \t]*$/.test(l));
    if (end > 0) {
      const raw = lines.slice(1, end).join('\n');
      let data: Record<string, unknown> = {};
      let error: string | null = null;
      try {
        const parsed: unknown = raw.trim() === '' ? {} : parseYaml(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as Record<string, unknown>;
        else if (parsed != null) error = 'Frontmatter must be a set of key: value properties';
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      frontmatter = { data, raw, startLine: 0, endLine: end, error };
      for (let k = 0; k <= end; k++) {
        lineKind[k] = 'yaml';
        atomId[k] = atom;
      }
      atom++;
      i = end + 1;
    }
  }

  for (; i < lines.length; i++) {
    const body = lines[i]!.replace(QUOTE_PREFIX, '');

    const fence = FENCE_OPEN.exec(body);
    if (fence && !(fence[1]![0] === '`' && fence[2]!.includes('`'))) {
      const marker = fence[1]!;
      const close = new RegExp(`^[ \\t]{0,3}${marker[0] === '`' ? '`' : '~'}{${marker.length},}[ \\t]*$`);
      let j = i + 1;
      while (j < lines.length && !close.test(lines[j]!.replace(QUOTE_PREFIX, ''))) j++;
      const end = Math.min(j, lines.length - 1);
      for (let k = i; k <= end; k++) {
        lineKind[k] = 'code';
        atomId[k] = atom;
      }
      atom++;
      i = end;
      continue;
    }

    const trimmed = body.trim();
    if (trimmed.startsWith('$$') && !/\$\$/.test(trimmed.slice(2))) {
      let j = i + 1;
      while (j < lines.length && !lines[j]!.includes('$$')) j++;
      const end = Math.min(j, lines.length - 1);
      for (let k = i; k <= end; k++) {
        lineKind[k] = 'math';
        atomId[k] = atom;
      }
      atom++;
      i = end;
      continue;
    }

    if (trimmed.startsWith('%%') && !trimmed.slice(2).includes('%%')) {
      let j = i + 1;
      while (j < lines.length && !lines[j]!.includes('%%')) j++;
      const end = Math.min(j, lines.length - 1);
      for (let k = i; k <= end; k++) {
        lineKind[k] = 'comment';
        atomId[k] = atom;
      }
      atom++;
      i = end;
    }
  }
  return frontmatter;
}

/** Replaces escapes, code spans, inline math and comments by spaces (newlines are kept). */
function maskInline(text: string): string {
  const out = text.split('');
  const mask = (from: number, to: number) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (c === '\\' && i + 1 < text.length && /[!-/:-@[-`{-~]/.test(text[i + 1]!)) {
      mask(i, i + 2);
      i += 2;
    } else if (c === '`') {
      let n = 0;
      while (text[i + n] === '`') n++;
      const close = findBacktickRun(text, i + n, n);
      if (close === -1) {
        i += n;
      } else {
        mask(i, close + n);
        i = close + n;
      }
    } else if (c === '%' && text[i + 1] === '%') {
      const end = text.indexOf('%%', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      mask(i, stop);
      i = stop;
    } else if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      const stop = end === -1 ? text.length : end + 3;
      mask(i, stop);
      i = stop;
    } else if (c === '$' && text[i + 1] === '$') {
      const end = text.indexOf('$$', i + 2);
      if (end === -1) {
        i += 2;
      } else {
        mask(i, end + 2);
        i = end + 2;
      }
    } else if (c === '$' && i + 1 < text.length && !/\s/.test(text[i + 1]!)) {
      const close = findInlineMathEnd(text, i + 1);
      if (close === -1) {
        i++;
      } else {
        mask(i, close + 1);
        i = close + 1;
      }
    } else {
      i++;
    }
  }
  return out.join('');
}

/** Closing run of exactly `n` backticks, not crossing a blank line. */
function findBacktickRun(text: string, from: number, n: number): number {
  let i = from;
  while (i < text.length) {
    if (text[i] === '\n' && /^\n[ \t]*\n/.test(text.slice(i, i + 64))) return -1;
    if (text[i] === '`') {
      let run = 0;
      while (text[i + run] === '`') run++;
      if (run === n) return i;
      i += run;
    } else {
      i++;
    }
  }
  return -1;
}

/** Obsidian inline math: `$x$`, closing `$` preceded by non-space and not followed by a digit. */
function findInlineMathEnd(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    const c = text[i]!;
    if (c === '\n') return -1;
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '$' && !/\s/.test(text[i - 1]!) && !/\d/.test(text[i + 1] ?? '')) return i;
  }
  return -1;
}

function maskRanges(text: string, ranges: { from: number; to: number }[]): string {
  if (ranges.length === 0) return text;
  let out = '';
  let last = 0;
  for (const { from, to } of [...ranges].sort((a, b) => a.from - b.from)) {
    out += text.slice(last, from) + blank(text.slice(from, to));
    last = to;
  }
  return out + text.slice(last);
}

function blank(s: string): string {
  return s.replace(/[^\n]/g, ' ');
}

function visualWidth(whitespace: string): number {
  let width = 0;
  for (const c of whitespace) width += c === '\t' ? 4 - (width % 4) : 1;
  return width;
}

function isBlank(line: string): boolean {
  return line.trim() === '';
}

function isListLine(line: string): boolean {
  const m = LIST_ITEM.exec(line);
  return m !== null && m[1] === '';
}

function isQuoteLine(line: string): boolean {
  return /^[ \t]{0,3}>/.test(line);
}

function buildSections(lines: string[], lineKind: (AtomicKind | null)[], atomId: number[]): SectionRef[] {
  const sections: SectionRef[] = [];
  let i = 0;
  while (i < lines.length) {
    const kind = lineKind[i];
    if (kind) {
      let j = i;
      while (j + 1 < lines.length && atomId[j + 1] === atomId[i]) j++;
      sections.push({ type: kind, startLine: i, endLine: j });
      i = j + 1;
      continue;
    }
    const line = lines[i]!;
    if (isBlank(line)) {
      i++;
      continue;
    }
    if (HEADING.test(line)) {
      sections.push({ type: 'heading', startLine: i, endLine: i });
      i++;
      continue;
    }
    if (THEMATIC_BREAK.test(line) && !isListLine(line)) {
      sections.push({ type: 'thematicBreak', startLine: i, endLine: i });
      i++;
      continue;
    }

    let type: SectionType = 'paragraph';
    if (isQuoteLine(line)) type = /^[ \t]{0,3}>[ \t]*\[![^\]]+\]/.test(line) ? 'callout' : 'blockquote';
    else if (isListLine(line)) type = 'list';
    else if (line.includes('|') && i + 1 < lines.length && TABLE_DELIMITER.test(lines[i + 1]!) && lines[i + 1]!.includes('-'))
      type = 'table';
    else if (HTML_START.test(line)) type = 'html';

    let j = i;
    for (;;) {
      const next = j + 1;
      if (next >= lines.length || lineKind[next]) break;
      const nextLine = lines[next]!;
      if (isBlank(nextLine)) {
        if (type !== 'list') break;
        // A list continues over blank lines when followed by an item or an indented line.
        let k = next;
        while (k < lines.length && !lineKind[k] && isBlank(lines[k]!)) k++;
        if (k < lines.length && !lineKind[k] && (isListLine(lines[k]!) || /^[ \t]+\S/.test(lines[k]!))) {
          j = k;
          continue;
        }
        break;
      }
      if (HEADING.test(nextLine) || (THEMATIC_BREAK.test(nextLine) && !isListLine(nextLine))) break;
      if (type === 'paragraph' && (isListLine(nextLine) || isQuoteLine(nextLine))) break;
      if ((type === 'blockquote' || type === 'callout') && !isQuoteLine(nextLine)) break;
      if (type === 'table' && !nextLine.includes('|')) break;
      if (type === 'list' && isQuoteLine(nextLine)) break;
      j = next;
    }
    sections.push({ type, startLine: i, endLine: j });
    i = j + 1;
  }
  return sections;
}

function resolveBlock(id: string, line: number, lines: string[], sections: SectionRef[], listItems: ListItemRef[]): BlockRef {
  const index = sections.findIndex((s) => s.startLine <= line && line <= s.endLine);
  const section = sections[index];
  const standalone = /^[ \t]*\^[A-Za-z0-9-]+[ \t]*$/.test(lines[line]!);

  if (standalone) {
    // "^id" on its own line names the block just before it.
    if (section && section.startLine < line) return { id, line, startLine: section.startLine, endLine: line - 1 };
    const previous = sections[index - 1];
    if (previous) return { id, line, startLine: previous.startLine, endLine: previous.endLine };
    return { id, line, startLine: line, endLine: line };
  }

  const itemIndex = listItems.findIndex((item) => item.line === line);
  if (itemIndex !== -1) {
    const item = listItems[itemIndex]!;
    let endLine = section?.endLine ?? line;
    for (const other of listItems.slice(itemIndex + 1)) {
      if (other.indent <= item.indent) {
        endLine = other.line - 1;
        break;
      }
    }
    while (endLine > line && isBlank(lines[endLine]!)) endLine--;
    return { id, line, startLine: line, endLine };
  }

  return { id, line, startLine: section?.startLine ?? line, endLine: section?.endLine ?? line };
}

function toStringList(value: unknown, separator: RegExp | null): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap((v) => toStringList(v, separator));
  if (typeof value === 'string' || typeof value === 'number') {
    const s = String(value).trim();
    if (s === '') return [];
    return separator ? s.split(separator).filter(Boolean) : [s];
  }
  return [];
}

function collectFrontmatterLinks(value: unknown, key: string, out: FrontmatterLinkRef[]) {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/\[\[([^[\]\n]+?)\]\]/g)) {
      out.push({ key, ...parseWikiInner(m[1]!), raw: m[0] });
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectFrontmatterLinks(v, key ? `${key}.${i}` : String(i), out));
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) collectFrontmatterLinks(v, key ? `${key}.${k}` : k, out);
  }
}
