import type { LinkRef } from '../markdown/types';
import { extname } from '../path';
import type { LinkFormat, LinkResolver } from './resolver';

export interface TextEdit {
  from: number;
  to: number;
  insert: string;
}

/** Applies non-overlapping edits (any order) to a text. */
export function applyEdits(text: string, edits: TextEdit[]): string {
  let out = text;
  for (const edit of [...edits].sort((a, b) => b.from - a.from)) {
    out = out.slice(0, edit.from) + edit.insert + out.slice(edit.to);
  }
  return out;
}

/** Guesses the format a link was written with, to keep it when rewriting. */
export function detectFormat(target: string): LinkFormat {
  if (/^\.\.?\//.test(target)) return 'relative';
  if (target.includes('/')) return 'absolute';
  return 'shortest';
}

/**
 * Rebuilds a link so it points to `newTargetPath`, keeping its kind, embed
 * flag, subpath, alias and path style. Returns null when nothing changes.
 */
export function retargetLink(link: LinkRef, newTargetPath: string, sourcePath: string, resolver: LinkResolver): string | null {
  const format = detectFormat(link.target);
  const keepExtension = link.kind === 'markdown' || extname(link.target) === 'md';
  const text = resolver.linkText(newTargetPath, sourcePath, format, keepExtension);
  if (link.kind === 'wiki') {
    const pipe = link.raw.includes('\\|') ? '\\|' : '|';
    const display = link.display !== null ? pipe + link.display : '';
    const next = `${link.embed ? '!' : ''}[[${text}${link.subpath}${display}]]`;
    return next === link.raw ? null : next;
  }
  const open = link.raw.indexOf('](');
  const destStart = open + 2;
  const destRaw = link.raw.slice(destStart).match(/^[ \t]*(<[^<>\n]*>|[^\s()<>]*(?:\([^\s()]*\)[^\s()<>]*)*)/);
  if (!destRaw) return null;
  const leading = destRaw[0].length - destRaw[1]!.length;
  const angled = destRaw[1]!.startsWith('<');
  const dest = angled ? `<${text}${link.subpath}>` : encodeMarkdownDestination(text + link.subpath);
  const next = link.raw.slice(0, destStart + leading) + dest + link.raw.slice(destStart + leading + destRaw[1]!.length);
  return next === link.raw ? null : next;
}

/** Percent-encodes what would break a markdown link destination (spaces, parentheses...). */
export function encodeMarkdownDestination(dest: string): string {
  return dest.replace(/[ ()<>%]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
}
