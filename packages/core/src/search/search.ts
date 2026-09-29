import type { NoteMetadata } from '../markdown/types';
import { basename } from '../path';
import { parseQuery, type Matcher, type QueryNode } from './query';

export interface SearchDocument {
  path: string;
  content: string;
  metadata?: NoteMetadata;
}

export interface SearchMatch {
  from: number;
  to: number;
  line: number;
}

export interface SearchResult {
  path: string;
  /** Content matches, in order (capped per file). */
  matches: SearchMatch[];
  /** The file name or path matched a term. */
  nameMatch: boolean;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  maxMatchesPerFile?: number;
}

interface Doc {
  path: string;
  name: string;
  content: string;
  lower: string;
  lines: string[] | null;
  lineStarts: number[] | null;
  metadata: NoteMetadata | undefined;
}

/** Runs an Obsidian-style query over documents. */
export function searchDocuments(
  documents: Iterable<SearchDocument>,
  query: string | QueryNode | null,
  options: SearchOptions = {},
): SearchResult[] {
  const node = typeof query === 'string' ? parseQuery(query) : query;
  if (!node) return [];
  const limit = options.limit ?? Infinity;
  const maxMatches = options.maxMatchesPerFile ?? 50;
  const results: SearchResult[] = [];

  for (const input of documents) {
    const doc: Doc = {
      path: input.path,
      name: basename(input.path),
      content: input.content,
      lower: input.content.toLowerCase(),
      lines: null,
      lineStarts: null,
      metadata: input.metadata,
    };
    if (!evaluate(node, doc, { text: doc.content, lower: doc.lower, offset: 0, scoped: false })) continue;
    const matches = collectMatches(node, doc, maxMatches);
    const nameMatch = matchesName(node, doc);
    results.push({ path: doc.path, matches, nameMatch, score: (nameMatch ? 100 : 0) + Math.min(matches.length, 50) });
  }

  results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return results.slice(0, limit);
}

interface Scope {
  text: string;
  lower: string;
  offset: number;
  /** Inside line:/block:/section:/task: — file names no longer count. */
  scoped: boolean;
}

function evaluate(node: QueryNode, doc: Doc, scope: Scope): boolean {
  switch (node.type) {
    case 'and':
      return node.children.every((c) => evaluate(c, doc, scope));
    case 'or':
      return node.children.some((c) => evaluate(c, doc, scope));
    case 'not':
      return !evaluate(node.child, doc, scope);
    case 'term':
      return evaluateTerm(node, doc, scope);
    case 'scoped':
      return unitsOf(node.scope, doc).some((unit) =>
        evaluate(node.child, doc, { text: unit.text, lower: unit.text.toLowerCase(), offset: unit.offset, scoped: true }),
      );
    case 'property':
      return evaluateProperty(node, doc);
  }
}

function evaluateTerm(node: Extract<QueryNode, { type: 'term' }>, doc: Doc, scope: Scope): boolean {
  const { matcher, caseSensitive } = node;
  switch (node.field) {
    case 'file':
      return test(matcher, doc.name, caseSensitive);
    case 'path':
      return test(matcher, doc.path, caseSensitive);
    case 'tag': {
      const tags = doc.metadata?.allTags ?? [];
      if (matcher.kind === 'regex') return tags.some((t) => matcher.regex.test(t));
      const wanted = (matcher.value.startsWith('#') ? matcher.value : '#' + matcher.value).toLowerCase();
      return tags.some((t) => {
        const tag = t.toLowerCase();
        return tag === wanted || tag.startsWith(wanted + '/');
      });
    }
    case 'content':
      return testScope(matcher, scope, caseSensitive);
    case 'any':
      return testScope(matcher, scope, caseSensitive) || (!scope.scoped && test(matcher, doc.name, caseSensitive));
  }
}

function evaluateProperty(node: Extract<QueryNode, { type: 'property' }>, doc: Doc): boolean {
  const data = doc.metadata?.frontmatter?.data;
  if (!data) return false;
  const key = Object.keys(data).find((k) => k.toLowerCase() === node.name.toLowerCase());
  if (key === undefined) return false;
  if (!node.value) return true;
  const values = flatten(data[key]);
  return values.some((value) => evaluate(node.value!, doc, { text: value, lower: value.toLowerCase(), offset: 0, scoped: true }));
}

function flatten(value: unknown): string[] {
  if (value == null) return ['null'];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value instanceof Date) return [value.toISOString().slice(0, 10)];
  if (typeof value === 'object') return Object.values(value).flatMap(flatten);
  return [String(value)];
}

function test(matcher: Matcher, text: string, caseSensitive: boolean): boolean {
  if (matcher.kind === 'regex') return matcher.regex.test(text);
  return caseSensitive ? text.includes(matcher.value) : text.toLowerCase().includes(matcher.value.toLowerCase());
}

function testScope(matcher: Matcher, scope: Scope, caseSensitive: boolean): boolean {
  if (matcher.kind === 'regex') return matcher.regex.test(scope.text);
  return caseSensitive ? scope.text.includes(matcher.value) : scope.lower.includes(matcher.value.toLowerCase());
}

interface Unit {
  text: string;
  offset: number;
}

function ensureLines(doc: Doc) {
  if (doc.lines) return;
  doc.lines = doc.content.split('\n');
  doc.lineStarts = [];
  let offset = 0;
  for (const line of doc.lines) {
    doc.lineStarts.push(offset);
    offset += line.length + 1;
  }
}

function lineRange(doc: Doc, start: number, end: number): Unit {
  ensureLines(doc);
  const from = doc.lineStarts![start] ?? 0;
  const endLine = Math.min(end, doc.lines!.length - 1);
  const to = doc.lineStarts![endLine]! + doc.lines![endLine]!.length;
  return { text: doc.content.slice(from, to), offset: from };
}

function unitsOf(scope: Extract<QueryNode, { type: 'scoped' }>['scope'], doc: Doc): Unit[] {
  ensureLines(doc);
  const meta = doc.metadata;
  switch (scope) {
    case 'line':
      return doc.lines!.map((text, i) => ({ text, offset: doc.lineStarts![i]! }));
    case 'block':
      if (meta) return meta.sections.map((s) => lineRange(doc, s.startLine, s.endLine));
      return splitParagraphs(doc);
    case 'section': {
      const headings = meta?.headings ?? [];
      const starts = [0, ...headings.map((h) => h.line)];
      return starts.map((start, i) => lineRange(doc, start, (starts[i + 1] ?? doc.lines!.length) - 1));
    }
    case 'task':
    case 'task-todo':
    case 'task-done': {
      const items = (meta?.listItems ?? []).filter((item) => {
        if (item.task === null) return false;
        if (scope === 'task-todo') return item.task === ' ';
        if (scope === 'task-done') return item.task !== ' ';
        return true;
      });
      return items.map((item) => lineRange(doc, item.line, item.line));
    }
  }
}

function splitParagraphs(doc: Doc): Unit[] {
  const units: Unit[] = [];
  let start = -1;
  doc.lines!.forEach((line, i) => {
    if (line.trim() === '') {
      if (start !== -1) units.push(lineRange(doc, start, i - 1));
      start = -1;
    } else if (start === -1) {
      start = i;
    }
  });
  if (start !== -1) units.push(lineRange(doc, start, doc.lines!.length - 1));
  return units;
}

/** Positions of every positive text term in the content, for highlighting. */
function collectMatches(node: QueryNode, doc: Doc, max: number): SearchMatch[] {
  const matchers: { matcher: Matcher; caseSensitive: boolean }[] = [];
  const walk = (n: QueryNode) => {
    if (n.type === 'and' || n.type === 'or') n.children.forEach(walk);
    else if (n.type === 'scoped') walk(n.child);
    else if (n.type === 'term' && (n.field === 'any' || n.field === 'content')) matchers.push(n);
  };
  walk(node);

  const found: { from: number; to: number }[] = [];
  for (const { matcher, caseSensitive } of matchers) {
    if (matcher.kind === 'regex') {
      const global = new RegExp(
        matcher.regex.source,
        matcher.regex.flags.includes('g') ? matcher.regex.flags : matcher.regex.flags + 'g',
      );
      for (const m of doc.content.matchAll(global)) {
        if (m[0].length === 0) break;
        found.push({ from: m.index, to: m.index + m[0].length });
        if (found.length >= max * 4) break;
      }
      continue;
    }
    if (matcher.value === '') continue;
    const haystack = caseSensitive ? doc.content : doc.lower;
    const needle = caseSensitive ? matcher.value : matcher.value.toLowerCase();
    for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) {
      found.push({ from: i, to: i + needle.length });
      if (found.length >= max * 4) break;
    }
  }

  found.sort((a, b) => a.from - b.from || b.to - a.to);
  const merged: { from: number; to: number }[] = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && range.from <= last.to) last.to = Math.max(last.to, range.to);
    else merged.push({ ...range });
  }

  ensureLines(doc);
  return merged.slice(0, max).map(({ from, to }) => ({ from, to, line: lineAt(doc.lineStarts!, from) }));
}

function matchesName(node: QueryNode, doc: Doc): boolean {
  switch (node.type) {
    case 'and':
    case 'or':
      return node.children.some((c) => matchesName(c, doc));
    case 'term':
      if (node.field === 'any' || node.field === 'file') return test(node.matcher, doc.name, node.caseSensitive);
      if (node.field === 'path') return test(node.matcher, doc.path, node.caseSensitive);
      return false;
    default:
      return false;
  }
}

function lineAt(starts: number[], pos: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
