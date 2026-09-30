import { syntaxTree } from '@codemirror/language';
import { EditorSelection, StateEffect, StateField, type EditorState, type Extension, type Range } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import type { SyntaxNodeRef } from '@lezer/common';
import { parseWikiInner } from '@cobblestone/core';
import { editorHost } from './host';
import { BulletWidget, CalloutBadgeWidget, CheckboxWidget, EmbedWidget, MathWidget, PropertiesWidget } from './widgets';

/*
 * Live preview: Markdown renders as you write. Syntax marks are hidden
 * except on the lines the selection touches (while the editor has focus),
 * so the text reads like the final page and edits like plain Markdown.
 */

const hidden = Decoration.replace({});
const bullet = Decoration.replace({ widget: new BulletWidget() });

function mark(cls: string, attributes?: Record<string, string>) {
  return Decoration.mark({ class: cls, attributes });
}

function line(cls: string, attributes?: Record<string, string>) {
  return Decoration.line({ class: cls, attributes });
}

/** Lines touched by the selection; empty when the editor is not focused. */
function activeLines(state: EditorState, focused: boolean): Set<number> {
  const lines = new Set<number>();
  if (!focused) return lines;
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let n = first; n <= last; n++) lines.add(n);
  }
  return lines;
}

function touchesSelection(state: EditorState, from: number, to: number, focused: boolean) {
  return focused && state.selection.ranges.some((r) => r.from <= to && r.to >= from);
}

function buildInline(view: EditorView): DecorationSet {
  const { state } = view;
  const focused = view.hasFocus;
  const active = activeLines(state, focused);
  const decorations: Range<Decoration>[] = [];
  const isActive = (pos: number) => active.has(state.doc.lineAt(pos).number);
  const activeRange = (from: number, to: number) => {
    const a = state.doc.lineAt(from).number;
    const b = state.doc.lineAt(to).number;
    for (let n = a; n <= b; n++) if (active.has(n)) return true;
    return false;
  };
  const hide = (from: number, to: number) => {
    if (to > from) decorations.push(hidden.range(from, to));
  };

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node: SyntaxNodeRef) => {
        const name = node.name;

        if (name.startsWith('ATXHeading')) {
          const level = Number(name.slice(-1));
          decorations.push(line(`cm-heading cm-h${level}`).range(state.doc.lineAt(node.from).from));
          return;
        }
        if (name === 'HeaderMark') {
          if (isActive(node.from)) return;
          const text = state.doc.sliceString(node.to, Math.min(node.to + 1, state.doc.length));
          // Opening "## " marks and closing "##" marks.
          const parent = node.node.parent;
          if (parent && node.from === parent.from) hide(node.from, node.to + (text === ' ' ? 1 : 0));
          else hide(node.from - (state.doc.sliceString(node.from - 1, node.from) === ' ' ? 1 : 0), node.to);
          return;
        }

        switch (name) {
          case 'Emphasis':
            decorations.push(mark('cm-em').range(node.from, node.to));
            return;
          case 'StrongEmphasis':
            decorations.push(mark('cm-strong').range(node.from, node.to));
            return;
          case 'Strikethrough':
            decorations.push(mark('cm-strike').range(node.from, node.to));
            return;
          case 'Highlight':
            decorations.push(mark('cm-highlight').range(node.from, node.to));
            return;
          case 'InlineCode':
            decorations.push(mark('cm-inline-code').range(node.from, node.to));
            return;
          case 'EmphasisMark':
          case 'StrikethroughMark':
          case 'HighlightMark':
            if (!isActive(node.from)) hide(node.from, node.to);
            return;
          case 'CodeMark': {
            const parent = node.node.parent?.name;
            if (parent === 'InlineCode' && !isActive(node.from)) hide(node.from, node.to);
            return;
          }
          case 'Tag':
            decorations.push(mark('cm-tag', { 'data-tag': state.doc.sliceString(node.from, node.to) }).range(node.from, node.to));
            return;
          case 'Comment':
            decorations.push(mark('cm-comment').range(node.from, node.to));
            return;
          case 'CommentBlock':
            for (let pos = node.from; pos <= node.to;) {
              const l = state.doc.lineAt(pos);
              decorations.push(line('cm-comment-line').range(l.from));
              pos = l.to + 1;
            }
            return false;
          case 'BlockId':
            decorations.push(mark('cm-block-id').range(node.from, node.to));
            return;
          case 'InlineMath': {
            if (activeRange(node.from, node.to)) {
              decorations.push(mark('cm-math-source').range(node.from, node.to));
              return false;
            }
            const raw = state.doc.sliceString(node.from, node.to);
            // "$$ … $$" over several lines of a paragraph: drawn by the block field, which alone may replace line breaks.
            if (raw.includes('\n')) return false;
            const display = raw.startsWith('$$');
            const tex = display ? raw.slice(2, -2) : raw.slice(1, -1);
            decorations.push(Decoration.replace({ widget: new MathWidget(tex, false) }).range(node.from, node.to));
            return false;
          }
          case 'Frontmatter':
            for (let pos = node.from; pos <= node.to;) {
              const l = state.doc.lineAt(pos);
              decorations.push(line('cm-frontmatter').range(l.from));
              pos = l.to + 1;
            }
            return false;
          case 'FencedCode': {
            const first = state.doc.lineAt(node.from).number;
            const last = state.doc.lineAt(node.to).number;
            for (let n = first; n <= last; n++) {
              const cls = `cm-codeblock${n === first ? ' cm-codeblock-first' : ''}${n === last ? ' cm-codeblock-last' : ''}`;
              decorations.push(line(cls).range(state.doc.line(n).from));
            }
            return;
          }
          case 'HorizontalRule':
            if (!isActive(node.from)) {
              decorations.push(line('cm-hr').range(state.doc.lineAt(node.from).from));
              hide(node.from, node.to);
            }
            return;
          case 'Blockquote':
            decorateQuote(node, state, active, decorations);
            return;
          case 'QuoteMark':
            if (!isActive(node.from)) {
              const next = state.doc.sliceString(node.to, node.to + 1);
              hide(node.from, node.to + (next === ' ' ? 1 : 0));
            }
            return;
          case 'ListMark': {
            const listType = node.node.parent?.parent?.name;
            if (listType !== 'BulletList') return;
            const item = node.node.parent!;
            const task = item.getChild('Task');
            if (task) {
              // Tasks show the checkbox instead of the bullet.
              if (!touchesSelection(state, node.from, task.from + 3, focused)) hide(node.from, task.from);
              return;
            }
            if (!touchesSelection(state, node.from, node.to, focused)) decorations.push(bullet.range(node.from, node.to));
            return;
          }
          case 'TaskMarker': {
            if (touchesSelection(state, node.from, node.to, focused)) return;
            const status = state.doc.sliceString(node.from + 1, node.from + 2);
            decorations.push(Decoration.replace({ widget: new CheckboxWidget(status, node.from) }).range(node.from, node.to));
            const itemLine = state.doc.lineAt(node.from);
            if (status !== ' ') decorations.push(line('cm-task-done').range(itemLine.from));
            return;
          }
          case 'WikiLink':
            decorateWikiLink(node, state, isActive(node.from), decorations);
            return false;
          case 'Embed': {
            if (activeRange(node.from, node.to)) {
              decorations.push(mark('cm-embed-source').range(node.from, node.to));
              return false;
            }
            const l = state.doc.lineAt(node.from);
            const alone = state.doc.sliceString(l.from, l.to).trim() === state.doc.sliceString(node.from, node.to);
            // Whole-line embeds are drawn by the block field below.
            if (alone) return false;
            const inner = state.doc.sliceString(node.from + 3, node.to - 2);
            const { target, subpath, display } = parseWikiInner(inner);
            decorations.push(
              Decoration.replace({ widget: new EmbedWidget(target + subpath, display, false) }).range(node.from, node.to),
            );
            return false;
          }
          case 'Link':
            decorateLink(node, state, isActive(node.from), decorations);
            return false;
          case 'Image': {
            if (activeRange(node.from, node.to)) return false;
            const url = node.node.getChild('URL');
            if (!url) return false;
            const raw = state.doc.sliceString(node.from, node.to);
            const alt = raw.slice(2, raw.indexOf(']('));
            let target = state.doc.sliceString(url.from, url.to).replace(/^<|>$/g, '');
            try {
              target = decodeURI(target);
            } catch {
              // keep as written
            }
            decorations.push(
              Decoration.replace({ widget: new EmbedWidget(target, alt || null, false) }).range(node.from, node.to),
            );
            return false;
          }
          case 'URL': {
            const parent = node.node.parent?.name;
            if (parent === 'Link' || parent === 'Image') return;
            const href = state.doc.sliceString(node.from, node.to);
            decorations.push(mark('cm-url', { 'data-href': href }).range(node.from, node.to));
            return;
          }
        }
        return;
      },
    });
  }
  return Decoration.set(decorations, true);
}

function decorateWikiLink(node: SyntaxNodeRef, state: EditorState, active: boolean, out: Range<Decoration>[]) {
  const inner = state.doc.sliceString(node.from + 2, node.to - 2);
  const { target, subpath, display } = parseWikiInner(inner);
  const host = state.facet(editorHost);
  const resolved = target === '' || !!host?.resolve(target);
  const cls = `cm-wikilink${resolved ? '' : ' is-unresolved'}`;
  const attrs = { 'data-link-target': target + subpath };
  if (active) {
    out.push(mark(`${cls} is-source`, attrs).range(node.from, node.to));
    return;
  }
  const targetNode = node.node.getChild('WikiLinkTarget');
  const aliasNode = node.node.getChild('WikiLinkAlias');
  if (aliasNode && display !== null) {
    out.push(hidden.range(node.from, aliasNode.from));
    out.push(mark(cls, attrs).range(aliasNode.from, aliasNode.to));
    out.push(hidden.range(aliasNode.to, node.to));
  } else if (targetNode) {
    out.push(hidden.range(node.from, targetNode.from));
    out.push(mark(cls, attrs).range(targetNode.from, targetNode.to));
    out.push(hidden.range(targetNode.to, node.to));
  }
}

function decorateLink(node: SyntaxNodeRef, state: EditorState, active: boolean, out: Range<Decoration>[]) {
  const marks = node.node.getChildren('LinkMark');
  const url = node.node.getChild('URL');
  // "[text]" alone is plain text (a reference link needs a definition, and vaults have none).
  if (!url && !node.node.getChild('LinkLabel')) return;
  const href = url ? state.doc.sliceString(url.from, url.to).replace(/^<|>$/g, '') : '';
  const external = /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');
  let target = href;
  try {
    target = decodeURI(href);
  } catch {
    // keep as written
  }
  const attrs: Record<string, string> = external ? { 'data-href': href } : { 'data-link-target': target };
  const cls = external ? 'cm-link cm-external-link' : 'cm-link';
  if (active || marks.length < 2) {
    out.push(mark(`${cls} is-source`, attrs).range(node.from, node.to));
    return;
  }
  const open = marks[0]!;
  const close = marks[1]!;
  out.push(hidden.range(open.from, open.to));
  if (close.from > open.to) out.push(mark(cls, attrs).range(open.to, close.from));
  out.push(hidden.range(close.from, node.to));
}

const CALLOUT = /^\s*>\s*\[!([^\]]+)\]([+-]?)/;

function decorateQuote(node: SyntaxNodeRef, state: EditorState, active: Set<number>, out: Range<Decoration>[]) {
  const firstLine = state.doc.lineAt(node.from);
  const lastLine = state.doc.lineAt(node.to);
  const callout = CALLOUT.exec(firstLine.text);
  const type = callout?.[1]?.trim().toLowerCase();
  for (let n = firstLine.number; n <= lastLine.number; n++) {
    const l = state.doc.line(n);
    const cls = [callout ? 'cm-callout' : 'cm-quote', n === firstLine.number && 'is-first', n === lastLine.number && 'is-last']
      .filter(Boolean)
      .join(' ');
    out.push(line(cls, type ? { 'data-callout': type } : undefined).range(l.from));
  }
  if (callout && !active.has(firstLine.number)) {
    const start = firstLine.from + firstLine.text.indexOf('[!');
    const end = firstLine.from + callout[0].length;
    out.push(Decoration.replace({ widget: new CalloutBadgeWidget(type!) }).range(start, end));
  }
}

const inlinePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildInline(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        update.focusChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildInline(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

/** Editor focus, mirrored into the state so block widgets can react to it. */
const setFocused = StateEffect.define<boolean>();
const focusField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setFocused)) return effect.value;
    return value;
  },
});
const focusTracker = EditorView.focusChangeEffect.of((_state, focusing) => setFocused.of(focusing));

/** Block widgets (properties, display math, whole-line embeds) must come from a state field. */
function buildBlocks(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const selectionLines = new Set<number>();
  const focused = state.field(focusField, false) ?? false;
  for (const range of focused ? state.selection.ranges : []) {
    for (let n = state.doc.lineAt(range.from).number; n <= state.doc.lineAt(range.to).number; n++) selectionLines.add(n);
  }
  const touched = (from: number, to: number) => {
    for (let n = state.doc.lineAt(from).number; n <= state.doc.lineAt(to).number; n++) if (selectionLines.has(n)) return true;
    return false;
  };
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Frontmatter') {
        if (touched(node.from, node.to)) return false;
        const lines = state.doc.sliceString(node.from, node.to).split('\n');
        const yaml = lines.slice(1, -1).join('\n');
        decorations.push(Decoration.replace({ widget: new PropertiesWidget(yaml), block: true }).range(node.from, node.to));
        return false;
      }
      if (node.name === 'InlineMath' && state.doc.sliceString(node.from, node.to).includes('\n')) {
        if (touched(node.from, node.to)) return false;
        const tex = state.doc
          .sliceString(node.from, node.to)
          .replace(/^\$\$?/, '')
          .replace(/\$?\$$/, '');
        decorations.push(Decoration.replace({ widget: new MathWidget(tex, true) }).range(node.from, node.to));
        return false;
      }
      if (node.name === 'MathBlock') {
        if (touched(node.from, node.to)) return false;
        const raw = state.doc.sliceString(node.from, node.to).trim();
        const tex = raw.replace(/^\$\$/, '').replace(/\$\$$/, '');
        decorations.push(Decoration.replace({ widget: new MathWidget(tex, true), block: true }).range(node.from, node.to));
        return false;
      }
      if (node.name === 'Embed') {
        const l = state.doc.lineAt(node.from);
        if (state.doc.sliceString(l.from, l.to).trim() !== state.doc.sliceString(node.from, node.to)) return false;
        if (touched(node.from, node.to)) return false;
        const { target, subpath, display } = parseWikiInner(state.doc.sliceString(node.from + 3, node.to - 2));
        decorations.push(
          Decoration.replace({ widget: new EmbedWidget(target + subpath, display, true), block: true }).range(l.from, l.to),
        );
        return false;
      }
      return;
    },
  });
  return Decoration.set(decorations, true);
}

const blockPreview = StateField.define<DecorationSet>({
  create: buildBlocks,
  update(value, tr) {
    const focusChanged = tr.effects.some((e) => e.is(setFocused));
    if (tr.docChanged || tr.selection || focusChanged || syntaxTree(tr.startState) !== syntaxTree(tr.state))
      return buildBlocks(tr.state);
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** Clicks on rendered links follow them; Ctrl/Cmd-click opens a new tab. */
const linkClicks = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 0) return false;
    const target = event.target as HTMLElement;
    const host = view.state.facet(editorHost);
    if (!host) return false;
    const link = target.closest<HTMLElement>('[data-link-target], [data-href], [data-tag]');
    if (!link) return false;
    const modifier = event.metaKey || event.ctrlKey;
    // In source form (the line being edited), a plain click places the cursor.
    if (link.classList.contains('is-source') && !modifier) return false;
    event.preventDefault();
    if (link.dataset.linkTarget !== undefined) host.openLink(link.dataset.linkTarget, { newTab: modifier });
    else if (link.dataset.href) host.openExternal(link.dataset.href);
    else if (link.dataset.tag) host.openTag(link.dataset.tag);
    return true;
  },
});

/** Ctrl/Cmd + hover on a link previews its target, as in Obsidian's editing mode. */
const linkHovers = EditorView.domEventHandlers({
  mousemove(event, view) {
    const host = view.state.facet(editorHost);
    const link = (event.target as HTMLElement).closest<HTMLElement>('[data-link-target]');
    if (!host || !link || !(event.ctrlKey || event.metaKey)) return false;
    host.previewLink(link.dataset.linkTarget ?? '', link);
    return false;
  },
  mouseout(event, view) {
    const link = (event.target as HTMLElement).closest('[data-link-target]');
    if (link && !link.contains(event.relatedTarget as Node)) view.state.facet(editorHost)?.endPreview();
    return false;
  },
});

/** Clicking below a trailing block widget should still place the cursor at the end. */
const clickBelow = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.target !== view.contentDOM) return false;
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos !== null) return false;
    view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
    return false;
  },
});

export function livePreview(): Extension {
  return [
    focusField,
    focusTracker,
    inlinePreview,
    blockPreview,
    linkClicks,
    linkHovers,
    clickBelow,
    EditorView.editorAttributes.of({ class: 'cm-live-preview' }),
  ];
}

/** Source mode still sizes headings, follows links with Ctrl/Cmd-click and previews them with Ctrl/Cmd held. */
export function sourceDecorations(): Extension {
  return [linkClicks, linkHovers];
}
