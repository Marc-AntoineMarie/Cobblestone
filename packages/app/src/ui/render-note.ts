import DOMPurify from 'dompurify';
import { extname, parseEmbedSize, splitSubpath } from '@cobblestone/core';
import { renderMarkdown, stripFrontmatter } from '../markdown/render';
import { t } from '../i18n';
import type { Session } from '../session';

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const AUDIO = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac']);
const VIDEO = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv']);
const MAX_DEPTH = 4;

export interface RenderContext {
  session: Session;
  sourcePath: string;
  /** Embed nesting, to stop runaway transclusions. */
  depth?: number;
  /** Paths already being rendered up the chain (cycle detection). */
  ancestors?: string[];
  /** Markdown line offset of `text` inside the note (for task toggling). */
  lineOffset?: number;
  onToggleTask?: (line: number) => void;
}

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'data-line', 'data-task', 'data-callout', 'data-href', 'data-src', 'data-alt', 'data-tag', 'data-source'],
    ADD_TAGS: ['input'],
    FORBID_TAGS: ['style', 'form', 'script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}

/** Renders Markdown into `container` and wires links, embeds, tasks and callouts. Returns a cleanup. */
export function renderNoteInto(container: HTMLElement, text: string, ctx: RenderContext): () => void {
  const { body, offsetLines } = stripFrontmatter(text);
  const lineOffset = (ctx.lineOffset ?? 0) + offsetLines;
  container.innerHTML = sanitize(renderMarkdown(body, { breaks: ctx.session.settings.getState().lineBreaks }));
  // Block line numbers become note line numbers (frontmatter and embed offsets included).
  for (const el of container.querySelectorAll<HTMLElement>('[data-line]:not(input)')) {
    el.dataset.line = String(Number(el.dataset.line) + lineOffset);
  }
  const cleanups: (() => void)[] = [];
  const { session, sourcePath } = ctx;
  const resolve = (linkpath: string) => session.vault.cache.resolve(linkpath, sourcePath);

  // Internal links: mark missing targets.
  for (const link of container.querySelectorAll<HTMLAnchorElement>('a.internal-link')) {
    const { target } = splitSubpath(link.dataset.href ?? '');
    if (target && !resolve(target)) link.classList.add('is-unresolved');
  }

  // Embeds.
  for (const embed of container.querySelectorAll<HTMLElement>('.internal-embed')) {
    const src = embed.dataset.src ?? '';
    const { target, subpath } = splitSubpath(src);
    const path = target ? resolve(target) : sourcePath;
    if (!path) {
      embed.classList.add('is-missing');
      embed.textContent = t('note.embedMissing', { name: target });
      continue;
    }
    const ext = extname(path);
    const size = parseEmbedSize(embed.dataset.alt ?? null);
    if (IMAGE.has(ext)) {
      const img = document.createElement('img');
      img.alt = size ? '' : (embed.dataset.alt ?? '');
      if (size?.width) img.width = size.width;
      if (size?.height) img.height = size.height;
      void session.resourceUrl(path).then((url) => (img.src = url));
      embed.replaceChildren(img);
      embed.classList.add('is-image');
    } else if (AUDIO.has(ext) || VIDEO.has(ext)) {
      const media = document.createElement(AUDIO.has(ext) ? 'audio' : 'video');
      media.controls = true;
      void session.resourceUrl(path).then((url) => (media.src = url));
      embed.replaceChildren(media);
    } else if (ext === 'pdf') {
      const frame = document.createElement('iframe');
      frame.className = 'embed-pdf';
      frame.title = target;
      void session.resourceUrl(path).then((url) => (frame.src = url + (subpath.startsWith('#page=') ? subpath : '')));
      embed.replaceChildren(frame);
    } else if (ext === 'md') {
      embed.classList.add('is-note');
      cleanups.push(renderEmbeddedNote(embed, path, subpath, ctx));
    } else {
      embed.textContent = target;
    }
  }

  // Tasks write back to the file.
  if (ctx.onToggleTask) {
    for (const box of container.querySelectorAll<HTMLInputElement>('input.task-list-item-checkbox')) {
      const line = Number(box.dataset.line);
      if (Number.isNaN(line) || line < 0) {
        box.disabled = true;
        continue;
      }
      box.addEventListener('click', (e) => {
        e.preventDefault();
        ctx.onToggleTask?.(line + lineOffset);
      });
    }
  } else {
    for (const box of container.querySelectorAll<HTMLInputElement>('input.task-list-item-checkbox')) box.disabled = true;
  }

  // Foldable callouts.
  for (const title of container.querySelectorAll<HTMLElement>('.callout.is-collapsible > .callout-title')) {
    title.setAttribute('role', 'button');
    title.tabIndex = 0;
    const callout = title.parentElement!;
    title.setAttribute('aria-expanded', String(!callout.classList.contains('is-collapsed')));
    const toggle = () => {
      callout.classList.toggle('is-collapsed');
      title.setAttribute('aria-expanded', String(!callout.classList.contains('is-collapsed')));
    };
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  }

  // Diagrams load their renderer only when a note has one.
  const diagrams = [...container.querySelectorAll<HTMLElement>('.mermaid-diagram')];
  if (diagrams.length) void renderDiagrams(diagrams);

  // Links, tags.
  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>('a.internal-link, a.tag, a.external-link');
    if (!link || !container.contains(link)) return;
    event.preventDefault();
    const newTab = event.metaKey || event.ctrlKey || event.button === 1;
    if (link.classList.contains('internal-link')) void session.openLink(link.dataset.href ?? '', sourcePath, newTab ? 'tab' : 'current');
    else if (link.classList.contains('tag')) session.findTag(link.dataset.tag ?? '');
    else session.platform.openExternal(link.href);
  };
  container.addEventListener('click', onClick);
  cleanups.push(() => container.removeEventListener('click', onClick));
  return () => cleanups.forEach((c) => c());
}

function renderEmbeddedNote(embed: HTMLElement, path: string, subpath: string, ctx: RenderContext): () => void {
  const depth = (ctx.depth ?? 0) + 1;
  const ancestors = ctx.ancestors ?? [ctx.sourcePath];
  if (depth > MAX_DEPTH || ancestors.includes(path + subpath)) {
    embed.classList.add('is-missing');
    embed.textContent = t('note.embedCycle');
    return () => undefined;
  }
  const { session } = ctx;
  const header = document.createElement('button');
  header.className = 'embed-header';
  header.type = 'button';
  header.textContent = path.replace(/\.md$/, '').split('/').pop()! + (subpath ? ` › ${subpath.replace(/^#\^?/, '').replace(/#/g, ' › ')}` : '');
  header.addEventListener('click', () => session.openPath(path, 'current', subpath || undefined));
  const content = document.createElement('div');
  content.className = 'embed-content markdown-rendered';
  embed.replaceChildren(header, content);

  let cleanup: (() => void) | null = null;
  const draw = async () => {
    const full = await session.vault.read(path);
    let text = full;
    let lineOffset = 0;
    if (subpath) {
      const range = session.locate(path, subpath);
      if (!range) {
        content.textContent = t('note.embedMissing', { name: subpath });
        return;
      }
      const lines = full.split('\n');
      text = lines.slice(range.from, range.to + 1).join('\n');
      lineOffset = range.from;
    }
    cleanup?.();
    cleanup = renderNoteInto(content, text, {
      session,
      sourcePath: path,
      depth,
      ancestors: [...ancestors, path + subpath],
      lineOffset,
    });
  };
  void draw();
  const off = session.vault.on('modify', (file) => file.path === path && void draw());
  return () => {
    off();
    cleanup?.();
  };
}

let mermaidLoader: Promise<typeof import('mermaid').default> | null = null;

async function renderDiagrams(elements: HTMLElement[]) {
  mermaidLoader ??= import('mermaid').then((m) => {
    const night = document.documentElement.dataset.paper === 'night';
    m.default.initialize({ startOnLoad: false, securityLevel: 'strict', theme: night ? 'dark' : 'neutral', fontFamily: 'inherit' });
    return m.default;
  });
  const mermaid = await mermaidLoader;
  for (const el of elements) {
    try {
      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      const { svg } = await mermaid.render(id, el.dataset.source ?? '');
      el.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
    } catch (error) {
      el.textContent = error instanceof Error ? error.message : String(error);
      el.classList.add('is-error');
    }
  }
}
