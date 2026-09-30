import { WidgetType, type EditorView } from '@codemirror/view';
import { parse as parseYaml } from 'yaml';
import { extname, parseEmbedSize } from '@cobblestone/core';
import { t } from '../i18n';
import { renderTex } from '../markdown/katex';
import { editorHost } from './host';

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', '3gp']);
const VIDEO_EXT = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv']);

export class CheckboxWidget extends WidgetType {
  constructor(
    readonly status: string,
    readonly pos: number,
  ) {
    super();
  }
  override eq(other: CheckboxWidget) {
    return other.status === this.status && other.pos === this.pos;
  }
  toDOM(view: EditorView) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'cm-task-checkbox';
    box.checked = this.status !== ' ';
    box.dataset.task = this.status;
    box.setAttribute('aria-label', this.status === ' ' ? 'Mark as done' : 'Mark as not done');
    box.addEventListener('mousedown', (e) => e.preventDefault());
    box.addEventListener('click', (e) => {
      e.preventDefault();
      // "[ ]" -> "[x]", anything else -> "[ ]"
      const insert = this.status === ' ' ? 'x' : ' ';
      view.dispatch({ changes: { from: this.pos + 1, to: this.pos + 2, insert } });
    });
    return box;
  }
  override ignoreEvent() {
    return true;
  }
}

export class BulletWidget extends WidgetType {
  override eq() {
    return true;
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-bullet';
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
}

export class MathWidget extends WidgetType {
  constructor(
    readonly tex: string,
    readonly display: boolean,
  ) {
    super();
  }
  override eq(other: MathWidget) {
    return other.tex === this.tex && other.display === this.display;
  }
  toDOM() {
    const el = document.createElement(this.display ? 'div' : 'span');
    el.className = this.display ? 'cm-math-block' : 'cm-math-inline';
    renderTex(el, this.tex, this.display);
    return el;
  }
  override ignoreEvent() {
    return false;
  }
}

/** Callout type badge shown instead of "[!type]". */
export class CalloutBadgeWidget extends WidgetType {
  constructor(readonly type: string) {
    super();
  }
  override eq(other: CalloutBadgeWidget) {
    return other.type === this.type;
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-callout-badge';
    span.dataset.callout = this.type;
    span.textContent = this.type;
    return span;
  }
}

const embedCleanups = new WeakMap<HTMLElement, () => void>();

/** Embedded attachment or note: `![[target]]` or `![alt](target)`. */
export class EmbedWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly display: string | null,
    readonly block: boolean,
  ) {
    super();
  }
  override eq(other: EmbedWidget) {
    return other.target === this.target && other.display === this.display && other.block === this.block;
  }
  toDOM(view: EditorView) {
    const host = view.state.facet(editorHost);
    const wrap = document.createElement(this.block ? 'div' : 'span');
    wrap.className = 'cm-embed';
    const external = /^[a-z][a-z0-9+.-]*:/i.test(this.target);
    const [linkpath] = this.target.split('#');
    const path = external ? null : (host?.resolve(linkpath ?? '') ?? null);
    const ext = extname(external ? new URL(this.target, 'https://x').pathname : (path ?? linkpath ?? ''));
    const size = parseEmbedSize(this.display);

    if (IMAGE_EXT.has(ext) || (external && !ext)) {
      const img = document.createElement('img');
      img.className = 'cm-embed-image';
      img.alt = this.display && !size ? this.display : '';
      if (size?.width) img.style.width = `${size.width}px`;
      if (size?.height) img.style.height = `${size.height}px`;
      if (external) img.src = this.target;
      else if (path && host) void host.resourceUrl(path).then((url) => (img.src = url));
      else return this.missing(wrap, linkpath ?? this.target);
      wrap.append(img);
      return wrap;
    }
    if (!external && !path) return this.missing(wrap, linkpath ?? this.target);
    if (path && host && (AUDIO_EXT.has(ext) || VIDEO_EXT.has(ext) || ext === 'pdf')) {
      const media =
        ext === 'pdf'
          ? Object.assign(document.createElement('iframe'), { className: 'cm-embed-pdf', title: linkpath ?? '' })
          : Object.assign(document.createElement(AUDIO_EXT.has(ext) ? 'audio' : 'video'), {
              controls: true,
              className: 'cm-embed-media',
            });
      void host.resourceUrl(path).then((url) => (media.src = url));
      wrap.append(media);
      return wrap;
    }
    if (host && ext === 'md') {
      wrap.classList.add('cm-embed-note');
      embedCleanups.set(wrap, host.renderEmbed(wrap, this.target, this.display));
      return wrap;
    }
    wrap.textContent = this.target;
    return wrap;
  }
  private missing(wrap: HTMLElement, name: string) {
    wrap.classList.add('cm-embed-missing');
    wrap.textContent = name;
    return wrap;
  }
  override destroy(dom: HTMLElement) {
    embedCleanups.get(dom)?.();
    embedCleanups.delete(dom);
  }
  override get estimatedHeight() {
    return this.block ? 120 : -1;
  }
  /** Clicks on the embed's header, links and players are theirs; elsewhere they reveal the source to edit it. */
  override ignoreEvent(event: Event) {
    const target = event.target as HTMLElement | null;
    return !!target?.closest?.('.embed-header, a, button, audio, video, iframe, input');
  }
}

/** The YAML frontmatter shown as a list of properties; a click reveals the source. */
export class PropertiesWidget extends WidgetType {
  constructor(readonly yaml: string) {
    super();
  }
  override eq(other: PropertiesWidget) {
    return other.yaml === this.yaml;
  }
  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'cm-properties';
    const title = document.createElement('div');
    title.className = 'cm-properties-title';
    title.textContent = t('margin.properties');
    wrap.append(title);
    let data: unknown;
    try {
      data = this.yaml.trim() ? parseYaml(this.yaml) : {};
    } catch (error) {
      const message = document.createElement('p');
      message.className = 'cm-properties-error';
      message.textContent = error instanceof Error ? error.message.split('\n')[0]! : String(error);
      wrap.append(message);
      return wrap;
    }
    const list = document.createElement('dl');
    for (const [key, value] of Object.entries((data ?? {}) as Record<string, unknown>)) {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = key;
      const dd = document.createElement('dd');
      const values = Array.isArray(value) ? value : [value];
      const isTags = key === 'tags' || key === 'tag';
      for (const item of values) {
        const chip = document.createElement('span');
        const text = formatProperty(item);
        chip.className = isTags ? 'cm-property-tag' : values.length > 1 ? 'cm-property-chip' : 'cm-property-value';
        chip.textContent = isTags && !text.startsWith('#') ? '#' + text : text;
        dd.append(chip);
      }
      row.append(dt, dd);
      list.append(row);
    }
    if (!list.childElementCount) return wrap;
    wrap.append(list);
    return wrap;
  }
  override ignoreEvent() {
    return false;
  }
}

function formatProperty(value: unknown): string {
  if (value == null) return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).replace(/^\[\[(.*?)(\|.*)?\]\]$/, (_m, target: string, alias?: string) =>
    alias ? alias.slice(1) : target,
  );
}
