import { tags as t, Tag } from '@lezer/highlight';
import type { BlockContext, InlineContext, Line, MarkdownConfig } from '@lezer/markdown';

/*
 * Obsidian Flavored Markdown syntax for the CodeMirror/Lezer markdown parser:
 * wikilinks, embeds, tags, ==highlights==, %%comments%%, $math$, block ids
 * and YAML frontmatter. Node names are used by the live preview.
 */

export const ofmTags = {
  wikilink: Tag.define(t.link),
  tag: Tag.define(t.labelName),
  highlight: Tag.define(),
  comment: Tag.define(t.comment),
  math: Tag.define(t.string),
  blockId: Tag.define(t.meta),
  frontmatter: Tag.define(t.meta),
};

const HighlightDelim = { resolve: 'Highlight', mark: 'HighlightMark' };
const TAG_CHAR = /[\p{L}\p{N}\p{M}_\-/\p{Extended_Pictographic}‍️]/u;

function isSpace(code: number) {
  return code === 32 || code === 9 || code === 10 || code === 13 || code === -1;
}

export const WikiLinks: MarkdownConfig = {
  defineNodes: [
    { name: 'WikiLink', style: ofmTags.wikilink },
    { name: 'Embed', style: ofmTags.wikilink },
    { name: 'WikiLinkMark', style: t.processingInstruction },
    { name: 'WikiLinkTarget' },
    { name: 'WikiLinkAlias' },
  ],
  parseInline: [
    {
      name: 'WikiLink',
      before: 'Link',
      parse(cx: InlineContext, next: number, pos: number) {
        const embed = next === 33; /* ! */
        const open = embed ? pos + 1 : pos;
        if (cx.char(open) !== 91 || cx.char(open + 1) !== 91) return -1;
        let end = open + 2;
        while (end < cx.end) {
          const c = cx.char(end);
          if (c === 10 || (c === 91 && cx.char(end + 1) === 91)) return -1;
          if (c === 93 && cx.char(end + 1) === 93) break;
          end++;
        }
        if (end >= cx.end || end === open + 2) return -1;
        const inner = cx.slice(open + 2, end);
        const pipe = inner.search(/(?<!\\)\|/);
        const children = [cx.elt('WikiLinkMark', pos, open + 2)];
        if (pipe === -1) {
          children.push(cx.elt('WikiLinkTarget', open + 2, end));
        } else {
          const bar = open + 2 + pipe;
          children.push(cx.elt('WikiLinkTarget', open + 2, bar));
          children.push(cx.elt('WikiLinkMark', bar, bar + 1));
          children.push(cx.elt('WikiLinkAlias', bar + 1, end));
        }
        children.push(cx.elt('WikiLinkMark', end, end + 2));
        return cx.addElement(cx.elt(embed ? 'Embed' : 'WikiLink', pos, end + 2, children));
      },
    },
  ],
};

export const Tags: MarkdownConfig = {
  defineNodes: [{ name: 'Tag', style: ofmTags.tag }],
  parseInline: [
    {
      name: 'Tag',
      parse(cx: InlineContext, next: number, pos: number) {
        if (next !== 35 /* # */) return -1;
        if (pos > cx.offset && !isSpace(cx.char(pos - 1))) return -1;
        let end = pos + 1;
        while (end < cx.end && TAG_CHAR.test(String.fromCodePoint(cx.char(end)))) end++;
        while (end > pos + 1 && cx.char(end - 1) === 47 /* / */) end--;
        const name = cx.slice(pos + 1, end);
        if (!name || /^\p{N}+$/u.test(name)) return -1;
        return cx.addElement(cx.elt('Tag', pos, end));
      },
    },
  ],
};

export const Highlights: MarkdownConfig = {
  defineNodes: [
    { name: 'Highlight', style: ofmTags.highlight },
    { name: 'HighlightMark', style: t.processingInstruction },
  ],
  parseInline: [
    {
      name: 'Highlight',
      before: 'Emphasis',
      parse(cx: InlineContext, next: number, pos: number) {
        if (next !== 61 /* = */ || cx.char(pos + 1) !== 61 || cx.char(pos + 2) === 61) return -1;
        const before = cx.char(pos - 1);
        const after = cx.char(pos + 2);
        return cx.addDelimiter(HighlightDelim, pos, pos + 2, !isSpace(after), !isSpace(before) && before !== 61);
      },
    },
  ],
};

export const Comments: MarkdownConfig = {
  defineNodes: [
    { name: 'Comment', style: ofmTags.comment },
    { name: 'CommentBlock', block: true, style: ofmTags.comment },
  ],
  parseInline: [
    {
      name: 'Comment',
      before: 'Emphasis',
      parse(cx: InlineContext, next: number, pos: number) {
        if (next !== 37 || cx.char(pos + 1) !== 37) return -1;
        const close = cx.slice(pos + 2, cx.end).indexOf('%%');
        const end = close === -1 ? cx.end : pos + 2 + close + 2;
        return cx.addElement(cx.elt('Comment', pos, end));
      },
    },
  ],
  parseBlock: [
    {
      name: 'CommentBlock',
      before: 'FencedCode',
      parse(cx: BlockContext, line: Line) {
        const text = line.text.slice(line.pos);
        if (!text.startsWith('%%') || text.slice(2).includes('%%')) return false;
        const from = cx.lineStart + line.pos;
        let to = cx.lineStart + line.text.length;
        while (cx.nextLine()) {
          to = cx.lineStart + line.text.length;
          if (line.text.includes('%%')) {
            cx.nextLine();
            break;
          }
        }
        cx.addElement(cx.elt('CommentBlock', from, to));
        return true;
      },
    },
  ],
};

export const MathSyntax: MarkdownConfig = {
  defineNodes: [
    { name: 'InlineMath', style: ofmTags.math },
    { name: 'MathBlock', block: true, style: ofmTags.math },
    { name: 'MathMark', style: t.processingInstruction },
  ],
  parseInline: [
    {
      name: 'InlineMath',
      before: 'Escape',
      parse(cx: InlineContext, next: number, pos: number) {
        if (next !== 36 /* $ */) return -1;
        if (cx.char(pos + 1) === 36) {
          const close = cx.slice(pos + 2, cx.end).indexOf('$$');
          if (close === -1) return -1;
          const end = pos + 2 + close + 2;
          return cx.addElement(
            cx.elt('InlineMath', pos, end, [cx.elt('MathMark', pos, pos + 2), cx.elt('MathMark', end - 2, end)]),
          );
        }
        if (isSpace(cx.char(pos + 1))) return -1;
        for (let i = pos + 1; i < cx.end; i++) {
          const c = cx.char(i);
          if (c === 10) return -1;
          if (c === 92) {
            i++;
            continue;
          }
          if (c === 36 && !isSpace(cx.char(i - 1)) && !(cx.char(i + 1) >= 48 && cx.char(i + 1) <= 57)) {
            return cx.addElement(
              cx.elt('InlineMath', pos, i + 1, [cx.elt('MathMark', pos, pos + 1), cx.elt('MathMark', i, i + 1)]),
            );
          }
        }
        return -1;
      },
    },
  ],
  parseBlock: [
    {
      name: 'MathBlock',
      before: 'FencedCode',
      parse(cx: BlockContext, line: Line) {
        const text = line.text.slice(line.pos);
        if (!text.startsWith('$$')) return false;
        const from = cx.lineStart + line.pos;
        if (text.slice(2).includes('$$')) {
          cx.addElement(cx.elt('MathBlock', from, cx.lineStart + line.text.length));
          cx.nextLine();
          return true;
        }
        let to = cx.lineStart + line.text.length;
        while (cx.nextLine()) {
          to = cx.lineStart + line.text.length;
          if (line.text.includes('$$')) {
            cx.nextLine();
            break;
          }
        }
        cx.addElement(cx.elt('MathBlock', from, to));
        return true;
      },
    },
  ],
};

export const BlockIds: MarkdownConfig = {
  defineNodes: [{ name: 'BlockId', style: ofmTags.blockId }],
  parseInline: [
    {
      name: 'BlockId',
      parse(cx: InlineContext, next: number, pos: number) {
        if (next !== 94 /* ^ */) return -1;
        if (pos > cx.offset && !isSpace(cx.char(pos - 1))) return -1;
        let end = pos + 1;
        while (end < cx.end && /[A-Za-z0-9-]/.test(String.fromCharCode(cx.char(end)))) end++;
        if (end === pos + 1) return -1;
        let rest = end;
        while (rest < cx.end && (cx.char(rest) === 32 || cx.char(rest) === 9)) rest++;
        if (rest < cx.end && cx.char(rest) !== 10) return -1;
        return cx.addElement(cx.elt('BlockId', pos, end));
      },
    },
  ],
};

export const Frontmatter: MarkdownConfig = {
  defineNodes: [{ name: 'Frontmatter', block: true, style: ofmTags.frontmatter }],
  parseBlock: [
    {
      name: 'Frontmatter',
      before: 'HorizontalRule',
      parse(cx: BlockContext, line: Line) {
        if (cx.lineStart !== 0 || line.text.trimEnd() !== '---') return false;
        // Only a closed block is frontmatter: look ahead before consuming lines.
        const input = (cx as unknown as { input?: { length: number; read(from: number, to: number): string } }).input;
        if (input) {
          const head = input.read(0, Math.min(input.length, 200_000));
          if (!/\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.test(head.slice(line.text.length))) return false;
        }
        let to = line.text.length;
        while (cx.nextLine()) {
          to = cx.lineStart + line.text.length;
          if (/^(?:---|\.\.\.)\s*$/.test(line.text)) {
            cx.nextLine();
            break;
          }
        }
        cx.addElement(cx.elt('Frontmatter', 0, to));
        return true;
      },
    },
  ],
};

export const obsidianMarkdown: MarkdownConfig[] = [Frontmatter, WikiLinks, Tags, Highlights, Comments, MathSyntax, BlockIds];
