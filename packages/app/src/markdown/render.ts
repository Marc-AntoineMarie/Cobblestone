/// <reference path="../types/modules.d.ts" />
import MarkdownItFactory, { type MarkdownIt, type StateCore, type StateInline, type Token } from 'markdown-it';
import footnote from 'markdown-it-footnote';
import katex from 'katex';
import { isValidTagName, parseWikiInner } from '@cobblestone/core';

/*
 * Reading view renderer for Obsidian Flavored Markdown. It produces HTML
 * with data attributes; the React layer then resolves links, loads
 * attachments, transcludes embedded notes and renders diagrams.
 * The output must always go through `sanitize` before reaching the DOM.
 */

export interface RenderOptions {
  /** Obsidian's "strict line breaks" off: a single newline is a line break. */
  breaks?: boolean;
}

type Md = MarkdownIt;

const TAG_CHAR = /[\p{L}\p{N}\p{M}_\-/\p{Extended_Pictographic}‍️]/u;

function wikilinks(md: Md) {
  md.inline.ruler.before('link', 'wikilink', (state: StateInline, silent: boolean) => {
    const start = state.pos;
    const embed = state.src.charCodeAt(start) === 0x21; /* ! */
    const open = embed ? start + 1 : start;
    if (state.src.slice(open, open + 2) !== '[[') return false;
    const close = state.src.indexOf(']]', open + 2);
    if (close === -1) return false;
    const inner = state.src.slice(open + 2, close);
    if (!inner.trim() || /[[\]\n]/.test(inner)) return false;
    if (!silent) {
      const parsed = parseWikiInner(inner);
      const token = state.push(embed ? 'embed' : 'wikilink', '', 0);
      token.meta = parsed;
      token.content = inner;
    }
    state.pos = close + 2;
    return true;
  });

  md.renderer.rules.wikilink = (tokens, idx) => {
    const { target, subpath, display } = tokens[idx]!.meta as ReturnType<typeof parseWikiInner>;
    const href = target + subpath;
    const label = display ?? (target ? target + (subpath ? ' > ' + subpath.replace(/^#\^?/, '').replace(/#/g, ' > ') : '') : subpath.replace(/^#\^?/, ''));
    return `<a class="internal-link" data-href="${md.utils.escapeHtml(href)}" href="#">${md.utils.escapeHtml(label)}</a>`;
  };

  md.renderer.rules.embed = (tokens, idx) => {
    const { target, subpath, display } = tokens[idx]!.meta as ReturnType<typeof parseWikiInner>;
    const alt = display ? ` data-alt="${md.utils.escapeHtml(display)}"` : '';
    return `<span class="internal-embed" data-src="${md.utils.escapeHtml(target + subpath)}"${alt}></span>`;
  };
}

function tags(md: Md) {
  md.inline.ruler.push('tag', (state: StateInline, silent: boolean) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x23 /* # */) return false;
    if (start > 0 && !/\s/.test(state.src[start - 1]!)) return false;
    let end = start + 1;
    while (end < state.src.length && TAG_CHAR.test(state.src[end]!)) end++;
    const name = state.src.slice(start + 1, end).replace(/\/+$/, '');
    if (!isValidTagName(name)) return false;
    if (!silent) {
      const token = state.push('tag', '', 0);
      token.content = name;
    }
    state.pos = start + 1 + name.length;
    return true;
  });
  md.renderer.rules.tag = (tokens, idx) => {
    const name = md.utils.escapeHtml(tokens[idx]!.content);
    return `<a class="tag" data-tag="#${name}" href="#">#${name}</a>`;
  };
}

function highlights(md: Md) {
  md.inline.ruler.before('emphasis', 'highlight', (state: StateInline, silent: boolean) => {
    const start = state.pos;
    if (state.src.slice(start, start + 2) !== '==') return false;
    const end = state.src.indexOf('==', start + 2);
    if (end === -1 || end === start + 2) return false;
    if (/^\s/.test(state.src[start + 2]!)) return false;
    if (!silent) {
      state.push('mark_open', 'mark', 1);
      const oldMax = state.posMax;
      state.pos = start + 2;
      state.posMax = end;
      state.md.inline.tokenize(state);
      state.posMax = oldMax;
      state.push('mark_close', 'mark', -1);
    }
    state.pos = end + 2;
    return true;
  });
}

function comments(md: Md) {
  // Block comments: lines between %% fences disappear.
  md.block.ruler.before('fence', 'comment_block', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine]! + state.tShift[startLine]!;
    const line = state.src.slice(start, state.eMarks[startLine]);
    if (!line.startsWith('%%') || line.slice(2).includes('%%')) return false;
    if (silent) return true;
    let next = startLine + 1;
    while (next < endLine && !state.src.slice(state.bMarks[next]!, state.eMarks[next]).includes('%%')) next++;
    state.line = Math.min(next + 1, endLine);
    return true;
  });
  md.inline.ruler.before('emphasis', 'comment_inline', (state: StateInline) => {
    if (state.src.slice(state.pos, state.pos + 2) !== '%%') return false;
    const end = state.src.indexOf('%%', state.pos + 2);
    state.pos = end === -1 ? state.posMax : end + 2;
    return true;
  });
}

function math(md: Md) {
  const renderMath = (tex: string, displayMode: boolean) => {
    try {
      return katex.renderToString(tex, { displayMode, throwOnError: false, output: 'html', trust: false });
    } catch {
      return `<code class="math-error">${md.utils.escapeHtml(tex)}</code>`;
    }
  };

  md.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine]! + state.tShift[startLine]!;
    const first = state.src.slice(start, state.eMarks[startLine]);
    if (!first.startsWith('$$')) return false;
    if (silent) return true;
    let content: string;
    let next = startLine;
    const sameLineEnd = first.indexOf('$$', 2);
    if (sameLineEnd !== -1) {
      content = first.slice(2, sameLineEnd);
    } else {
      const lines = [first.slice(2)];
      next = startLine + 1;
      while (next < endLine) {
        const line = state.src.slice(state.bMarks[next]! + state.tShift[next]!, state.eMarks[next]);
        const close = line.indexOf('$$');
        if (close !== -1) {
          lines.push(line.slice(0, close));
          break;
        }
        lines.push(line);
        next++;
      }
      content = lines.join('\n');
    }
    const token = state.push('math_block', 'div', 0);
    token.content = content;
    token.map = [startLine, next + 1];
    state.line = next + 1;
    return true;
  });

  md.inline.ruler.after('escape', 'math_inline', (state: StateInline, silent: boolean) => {
    const start = state.pos;
    if (state.src[start] !== '$') return false;
    if (state.src[start + 1] === '$') {
      const end = state.src.indexOf('$$', start + 2);
      if (end === -1) return false;
      if (!silent) {
        const token = state.push('math_block_inline', '', 0);
        token.content = state.src.slice(start + 2, end);
      }
      state.pos = end + 2;
      return true;
    }
    if (/\s/.test(state.src[start + 1] ?? ' ')) return false;
    for (let i = start + 1; i < state.posMax; i++) {
      const c = state.src[i];
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '$' && !/\s/.test(state.src[i - 1]!) && !/\d/.test(state.src[i + 1] ?? '')) {
        if (!silent) {
          const token = state.push('math_inline', '', 0);
          token.content = state.src.slice(start + 1, i);
        }
        state.pos = i + 1;
        return true;
      }
    }
    return false;
  });

  md.renderer.rules.math_block = (tokens, idx) => `<div class="math math-block">${renderMath(tokens[idx]!.content, true)}</div>`;
  md.renderer.rules.math_block_inline = (tokens, idx) => `<span class="math math-block">${renderMath(tokens[idx]!.content, true)}</span>`;
  md.renderer.rules.math_inline = (tokens, idx) => `<span class="math math-inline">${renderMath(tokens[idx]!.content, false)}</span>`;
}

/** Task list items: "- [ ] todo" gets a checkbox that knows its source line. */
function tasks(md: Md) {
  md.core.ruler.after('inline', 'tasks', (state: StateCore) => {
    const tokens = state.tokens;
    for (let i = 2; i < tokens.length; i++) {
      const inline = tokens[i]!;
      if (inline.type !== 'inline' || tokens[i - 1]!.type !== 'paragraph_open' || tokens[i - 2]!.type !== 'list_item_open') continue;
      const m = /^\[(.)\](?=\s|$)/.exec(inline.content);
      if (!m) continue;
      const status = m[1]!;
      const item = tokens[i - 2]!;
      item.attrJoin('class', 'task-list-item');
      item.attrSet('data-task', status);
      if (status !== ' ') item.attrJoin('class', 'is-checked');
      const first = inline.children?.[0];
      if (first?.type === 'text') first.content = first.content.replace(/^\[.\]\s?/, '');
      const checkbox = new state.Token('html_inline', '', 0);
      const line = item.map?.[0] ?? -1;
      checkbox.content = `<input type="checkbox" class="task-list-item-checkbox" data-line="${line}"${status !== ' ' ? ' checked' : ''}>`;
      inline.children?.unshift(checkbox);
    }
  });
}

/** "> [!note]+ Title" blockquotes become (foldable) callouts. */
function callouts(md: Md) {
  md.core.ruler.after('inline', 'callouts', (state: StateCore) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i]!;
      if (open.type !== 'blockquote_open') continue;
      const inline = tokens[i + 2];
      if (tokens[i + 1]?.type !== 'paragraph_open' || inline?.type !== 'inline') continue;
      const m = /^\[!([^\]]+)\]([+-]?)[ \t]*([^\n]*)(?:\n|$)/.exec(inline.content);
      if (!m) continue;
      const type = m[1]!.trim().toLowerCase();
      const fold = m[2] as '' | '+' | '-';
      const title = m[3]!.trim() || type.charAt(0).toUpperCase() + type.slice(1);
      const close = findClose(tokens, i);
      open.type = 'callout_open';
      open.tag = 'div';
      open.meta = { type, fold, title: md.renderInline(title) };
      tokens[close]!.type = 'callout_close';
      tokens[close]!.tag = 'div';

      // Drop the "[!type] title" line from the first paragraph.
      const rest = inline.content.slice(m[0].length);
      if (rest.trim() === '') {
        tokens.splice(i + 1, 3);
      } else {
        inline.content = rest;
        inline.children = [];
        state.md.inline.parse(rest, state.md, state.env, inline.children);
      }
    }
  });
  const findClose = (tokens: Token[], openIndex: number) => {
    let depth = 0;
    for (let j = openIndex; j < tokens.length; j++) {
      if (tokens[j]!.type === 'blockquote_open') depth++;
      if (tokens[j]!.type === 'blockquote_close' && --depth === 0) return j;
    }
    return tokens.length - 1;
  };
  md.renderer.rules.callout_open = (tokens, idx) => {
    const { type, fold, title } = tokens[idx]!.meta as { type: string; fold: string; title: string };
    const foldable = fold !== '';
    const collapsed = fold === '-';
    const attrs = `class="callout${foldable ? ' is-collapsible' : ''}${collapsed ? ' is-collapsed' : ''}" data-callout="${md.utils.escapeHtml(type)}"`;
    return `<div ${attrs}><div class="callout-title"><span class="callout-icon" aria-hidden="true"></span><span class="callout-title-inner">${title}</span>${
      foldable ? '<span class="callout-fold" aria-hidden="true"></span>' : ''
    }</div><div class="callout-content">`;
  };
  md.renderer.rules.callout_close = () => '</div></div>';
}

/** Hides "^block-id" markers and turns them into anchors. */
function blockIds(md: Md) {
  md.core.ruler.after('inline', 'block_ids', (state: StateCore) => {
    for (let i = 0; i < state.tokens.length; i++) {
      const inline = state.tokens[i]!;
      if (inline.type !== 'inline' || !inline.children?.length) continue;
      const last = inline.children[inline.children.length - 1]!;
      if (last.type !== 'text') continue;
      const m = /(?:^|\s)\^([A-Za-z0-9-]+)\s*$/.exec(last.content);
      if (!m) continue;
      last.content = last.content.slice(0, m.index);
      const opener = state.tokens[i - 1];
      if (opener && opener.nesting === 1) opener.attrSet('id', `^${m[1]}`);
    }
  });
}

/** Mermaid diagrams render lazily; everything else is a normal code block. */
function fences(md: Md) {
  const base = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!;
    const lang = token.info.trim().split(/\s+/)[0]?.toLowerCase();
    if (lang === 'mermaid') return `<div class="mermaid-diagram" data-source="${md.utils.escapeHtml(token.content)}"></div>`;
    return base(tokens, idx, options, env, self);
  };
}

/** Adds the source line to block elements, to scroll-sync and map clicks back to the editor. */
function sourceLines(md: Md) {
  md.core.ruler.push('source_lines', (state: StateCore) => {
    for (const token of state.tokens) {
      if (token.map && token.nesting === 1 && token.level === 0) token.attrSet('data-line', String(token.map[0]));
    }
  });
}

export function createRenderer(options: RenderOptions = {}): Md {
  const md = MarkdownItFactory({ html: true, linkify: true, breaks: options.breaks ?? true, typographer: false });
  md.use(wikilinks).use(tags).use(highlights).use(comments).use(math).use(tasks).use(callouts).use(blockIds).use(fences).use(sourceLines);
  md.use(footnote);
  // Internal markdown links ([text](Note.md)) are resolved by the React layer.
  const linkOpen = md.renderer.rules.link_open ?? ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const token = tokens[idx]!;
    const href = String(token.attrGet('href') ?? '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) {
      token.attrSet('class', 'external-link');
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener noreferrer');
    } else {
      let decoded = href;
      try {
        decoded = decodeURI(href);
      } catch {
        // keep as written
      }
      token.attrSet('class', 'internal-link');
      token.attrSet('data-href', decoded);
      token.attrSet('href', '#');
    }
    return linkOpen(tokens, idx, opts, env, self);
  };
  return md;
}

/** Removes the YAML frontmatter block, which the properties view shows instead. */
export function stripFrontmatter(text: string): { body: string; offsetLines: number } {
  const m = /^---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { body: text, offsetLines: 0 };
  return { body: text.slice(m[0].length), offsetLines: m[0].split('\n').length - 1 };
}

let shared: Md | null = null;

export function renderMarkdown(text: string, options?: RenderOptions): string {
  const md = options ? createRenderer(options) : (shared ??= createRenderer());
  return md.render(text);
}
