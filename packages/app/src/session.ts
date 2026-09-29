import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  basename,
  dirname,
  extname,
  isInside,
  isValidFileName,
  joinPath,
  normalizePath,
  parseSubpath,
  splitSubpath,
  stem,
  Emitter,
  Vault,
  type VaultAdapter,
} from '@cobblestone/core';
import {
  loadBookmarks,
  removeFromBookmarks,
  renameInBookmarks,
  saveBookmarks,
  toggleFileBookmark,
  type Bookmark,
} from './bookmarks';
import type { EditorView } from '@codemirror/view';
import { CommandRegistry } from './commands';
import { getLanguage, t } from './i18n';
import type { Platform, VaultEntry } from './platform';
import { DEFAULT_SETTINGS, formatDate, loadVaultSettings, saveVaultSettings, type VaultSettings } from './settings';
import { applyTemplate, findTemplatesFolder, listTemplates } from './templates';
import {
  activeTab,
  initialWorkspace,
  open,
  panes,
  removePaths,
  renamePaths,
  viewForPath,
  viewPath,
  type OpenTarget,
  type ViewState,
  type WorkspaceState,
} from './workspace/workspace';

export interface MenuItem {
  label: string;
  run: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
}

/** A list to choose from in the finder (templates, and later other pickers). */
export interface PickRequest {
  mode: 'pick';
  placeholder: string;
  items: { id: string; label: string; detail?: string }[];
  onPick: (id: string) => void;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

export interface UIState {
  railOpen: boolean;
  marginOpen: boolean;
  finder: { mode: 'notes' | 'commands' } | PickRequest | null;
  menu: { x: number; y: number; items: MenuItem[] } | null;
  share: string | null;
  /** Tree item being renamed inline. */
  renaming: string | null;
  /** Note whose title should take focus (freshly created). */
  focusTitle: string | null;
  /** Folders expanded in the tree. */
  expanded: Record<string, boolean>;
  /** Tree item to scroll to and highlight. */
  revealed: string | null;
  /** Text of the rail's find field. */
  railQuery: string;
  /** Hover preview of a link target. */
  preview: { linktext: string; sourcePath: string; rect: { left: number; right: number; top: number; bottom: number } } | null;
  toasts: Toast[];
}

const WORKSPACE_KEY = (id: string) => `workspace:${id}`;
const RECENT_KEY = (id: string) => `recent:${id}`;

type SessionEvents = {
  /** Scroll a note to a line and place the cursor there. */
  jump: [path: string, line: number];
};

/** Everything about one open vault: storage, index, layout, settings and actions. */
export class Session {
  readonly commands = new CommandRegistry();
  readonly workspace: StoreApi<WorkspaceState>;
  readonly ui: StoreApi<UIState>;
  readonly settings: StoreApi<VaultSettings>;
  readonly bookmarks: StoreApi<Bookmark[]>;
  readonly events = new Emitter<SessionEvents>();
  /** Recently opened files, most recent first. */
  recent: string[] = [];
  private resourceUrls = new Map<string, string>();
  /** Editors by tab id, so commands can act on the active one. */
  private editors = new Map<string, EditorView>();
  private disposers: (() => void)[] = [];
  private toastId = 0;

  private constructor(
    readonly platform: Platform,
    readonly entry: VaultEntry,
    readonly vault: Vault,
    settings: VaultSettings,
    workspace: WorkspaceState,
    bookmarks: Bookmark[],
  ) {
    this.settings = createStore(() => settings);
    this.bookmarks = createStore<Bookmark[]>(() => bookmarks);
    this.workspace = createStore(() => workspace);
    this.ui = createStore<UIState>(() => ({
      railOpen: true,
      marginOpen: true,
      finder: null,
      menu: null,
      share: null,
      renaming: null,
      focusTitle: null,
      expanded: {},
      revealed: null,
      railQuery: '',
      preview: null,
      toasts: [],
    }));

    // Keep tabs in step with the files.
    this.disposers.push(
      vault.on('rename', (path, oldPath) => {
        this.workspace.setState((s) => renamePaths(s, oldPath, path));
        this.bookmarks.setState((b) => renameInBookmarks(b, oldPath, path), true);
        this.dropResource(oldPath);
      }),
      vault.on('delete', (path) => {
        this.workspace.setState((s) => removePaths(s, path));
        this.bookmarks.setState((b) => removeFromBookmarks(b, path), true);
        this.dropResource(path);
      }),
      vault.on('modify', (file) => this.dropResource(file.path)),
    );
    let lastActive: string | null = null;
    this.disposers.push(
      this.workspace.subscribe(() => {
        const path = this.activePath;
        if (!path || path === lastActive) return;
        lastActive = path;
        this.recent = [path, ...this.recent.filter((p) => p !== path)].slice(0, 50);
        void platform.storage.set(RECENT_KEY(entry.id), this.recent);
      }),
      vault.on('rename', (path, oldPath) => {
        this.recent = this.recent.map((p) => (isInside(p, oldPath) ? path + p.slice(oldPath.length) : p));
      }),
      vault.on('delete', (path) => {
        this.recent = this.recent.filter((p) => !isInside(p, path));
      }),
    );
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    this.disposers.push(
      this.workspace.subscribe((state) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => void platform.storage.set(WORKSPACE_KEY(entry.id), state), 500);
      }),
    );
    let bookmarksTimer: ReturnType<typeof setTimeout> | undefined;
    this.disposers.push(
      this.bookmarks.subscribe((items) => {
        clearTimeout(bookmarksTimer);
        bookmarksTimer = setTimeout(() => void saveBookmarks(vault.adapter, items).catch(() => undefined), 300);
      }),
    );
    let settingsTimer: ReturnType<typeof setTimeout> | undefined;
    this.disposers.push(
      this.settings.subscribe((next) => {
        vault.setOptions({ trash: next.trash, updateLinksOnRename: next.updateLinks });
        clearTimeout(settingsTimer);
        settingsTimer = setTimeout(() => void saveVaultSettings(vault.adapter, next).catch(() => undefined), 300);
      }),
    );
  }

  static async open(platform: Platform, entry: VaultEntry, adapter: VaultAdapter): Promise<Session> {
    const { settings, imported } = await loadVaultSettings(adapter);
    const vault = new Vault(adapter, { trash: settings.trash, updateLinksOnRename: settings.updateLinks });
    await vault.load();
    if (imported && entry.kind !== 'demo') await saveVaultSettings(adapter, settings).catch(() => undefined);

    let workspace = (await platform.storage.get<WorkspaceState>(WORKSPACE_KEY(entry.id))) ?? initialWorkspace();
    // Drop tabs whose files disappeared while the vault was closed.
    for (const path of new Set(allViewPaths(workspace))) {
      if (!vault.getFile(path)) workspace = removePaths(workspace, path);
    }
    const bookmarks = await loadBookmarks(adapter);
    if (bookmarks.imported && entry.kind !== 'demo') await saveBookmarks(adapter, bookmarks.items).catch(() => undefined);
    const session = new Session(platform, entry, vault, settings, workspace, bookmarks.items);
    session.recent = ((await platform.storage.get<string[]>(RECENT_KEY(entry.id))) ?? []).filter((p) => vault.getFile(p));
    if (entry.kind === 'demo' && (activeTab(workspace)?.view.type ?? 'empty') === 'empty') {
      const welcome = vault.getMarkdownFiles().find((f) => /^(Welcome|Bienvenue)\.md$/.test(f.path));
      if (welcome) session.openPath(welcome.path);
    }
    return session;
  }

  dispose() {
    for (const dispose of this.disposers) dispose();
    for (const url of this.resourceUrls.values()) URL.revokeObjectURL(url);
    this.resourceUrls.clear();
    this.vault.close();
  }

  // --------------------------------------------------------------- feedback

  notify(text: string, kind: Toast['kind'] = 'info') {
    const id = ++this.toastId;
    this.ui.setState((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => this.ui.setState((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), kind === 'error' ? 6000 : 3500);
  }

  private fail(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.notify(t('error.generic', { error: message }), 'error');
  }

  // --------------------------------------------------------------- navigation

  get activeView(): ViewState | undefined {
    return activeTab(this.workspace.getState())?.view;
  }

  /** Path of the note or file in the active tab. */
  get activePath(): string | null {
    const view = this.activeView;
    return view ? viewPath(view) : null;
  }

  openView(view: ViewState, target: OpenTarget = 'current') {
    this.workspace.setState((s) => open(s, view, target));
  }

  openPath(path: string, target: OpenTarget = 'current', subpath?: string) {
    const view = viewForPath(path);
    if (view.type === 'note') {
      if (subpath) view.subpath = subpath;
      view.mode = this.settings.getState().defaultMode;
    }
    this.openView(view, target);
  }

  /**
   * Follows a link written in `sourcePath`. Links to notes that do not
   * exist yet create them, like Obsidian.
   */
  async openLink(linktext: string, sourcePath: string, target: OpenTarget = 'current') {
    const { target: linkpath, subpath } = splitSubpath(linktext);
    if (!linkpath) {
      this.openPath(sourcePath, target, subpath || undefined);
      return;
    }
    const dest = this.vault.cache.resolve(linkpath, sourcePath);
    if (dest) {
      this.openPath(dest, target, subpath || undefined);
      return;
    }
    try {
      const name = linkpath.split('/').filter(Boolean);
      const hasFolder = name.length > 1;
      const folder = hasFolder ? name.slice(0, -1).join('/') : this.newNoteFolder(sourcePath);
      const file = stem(name[name.length - 1]!) + '.md';
      const created = await this.vault.create(joinPath(folder, file), '');
      this.openPath(created.path, target);
    } catch (error) {
      this.fail(error);
    }
  }

  toggleBookmark(path: string) {
    const kind = this.vault.getFolder(path) ? 'folder' : 'file';
    this.bookmarks.setState((b) => toggleFileBookmark(b, path, kind), true);
  }

  openBookmark(bookmark: Bookmark, target: OpenTarget = 'current') {
    if (bookmark.type === 'file') this.openPath(bookmark.path, target, bookmark.subpath);
    else if (bookmark.type === 'folder') this.revealInTree(bookmark.path);
    else if (bookmark.type === 'search') this.ui.setState({ railOpen: true, railQuery: bookmark.query });
  }

  /** Lists the notes carrying a tag in the rail. */
  findTag(tag: string) {
    this.ui.setState({ railOpen: true, railQuery: `tag:${tag.startsWith('#') ? tag : '#' + tag}` });
  }

  revealInTree(path: string) {
    const expanded = { ...this.ui.getState().expanded };
    for (let dir = dirname(path); dir; dir = dirname(dir)) expanded[dir] = true;
    this.ui.setState({ expanded, revealed: path, railOpen: true });
  }

  // --------------------------------------------------------------- files

  /** Folder for a new note, following the vault's setting. */
  newNoteFolder(fromPath: string | null = this.activePath): string {
    const settings = this.settings.getState();
    if (settings.newNoteLocation === 'folder') return normalizePath(settings.newNoteFolder);
    if (settings.newNoteLocation === 'current' && fromPath) return dirname(fromPath);
    return '';
  }

  /** "Untitled.md", "Untitled 1.md"... */
  availablePath(folder: string, name: string, extension = 'md'): string {
    const base = joinPath(folder, `${name}.${extension}`);
    if (!this.vault.exists(base)) return base;
    for (let i = 1; ; i++) {
      const candidate = joinPath(folder, `${name} ${i}.${extension}`);
      if (!this.vault.exists(candidate)) return candidate;
    }
  }

  async createNote(folder = this.newNoteFolder(), name = t('tree.untitled'), content = '', target: OpenTarget = 'current') {
    try {
      const file = await this.vault.create(this.availablePath(folder, name), content);
      this.openPath(file.path, target);
      this.ui.setState({ focusTitle: file.path });
      if (folder) this.revealInTree(file.path);
      return file.path;
    } catch (error) {
      this.fail(error);
      return null;
    }
  }

  async createFolder(parent = '') {
    try {
      let path = joinPath(parent, t('tree.newFolderName'));
      for (let i = 1; this.vault.exists(path); i++) path = joinPath(parent, `${t('tree.newFolderName')} ${i}`);
      await this.vault.createFolder(path);
      const expanded = { ...this.ui.getState().expanded, [parent]: true };
      this.ui.setState({ expanded, renaming: path });
    } catch (error) {
      this.fail(error);
    }
  }

  /** Renames a file or folder in place (keeps its extension and folder). */
  async rename(path: string, newName: string): Promise<boolean> {
    const clean = newName.trim();
    if (!clean) return false;
    if (!isValidFileName(clean)) {
      this.notify(t('error.invalidName'), 'error');
      return false;
    }
    const isFile = !!this.vault.getFile(path);
    const ext = isFile ? extname(path) : '';
    const target = joinPath(dirname(path), isFile && ext ? `${clean}.${ext}` : clean);
    if (target === path) return true;
    if (this.vault.exists(target) && target.toLowerCase() !== path.toLowerCase()) {
      this.notify(t('error.exists', { name: basename(target) }), 'error');
      return false;
    }
    try {
      await this.vault.rename(path, target);
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  async move(path: string, folder: string) {
    const target = joinPath(folder, basename(path));
    if (target === path || isInside(folder, path)) return;
    if (this.vault.exists(target)) {
      this.notify(t('error.exists', { name: basename(target) }), 'error');
      return;
    }
    try {
      await this.vault.rename(path, target);
    } catch (error) {
      this.fail(error);
    }
  }

  async delete(path: string) {
    try {
      await this.vault.delete(path, this.settings.getState().trash === 'permanent');
    } catch (error) {
      this.fail(error);
    }
  }

  async duplicate(path: string) {
    try {
      const ext = extname(path);
      const copy = this.availablePath(dirname(path), stem(path), ext);
      if (ext === 'md') await this.vault.create(copy, await this.vault.read(path));
      else await this.vault.createBinary(copy, await this.vault.readBinary(path));
      this.openPath(copy);
    } catch (error) {
      this.fail(error);
    }
  }

  async openDailyNote(date = new Date()) {
    const settings = this.settings.getState();
    const name = formatDate(date, settings.dailyFormat || DEFAULT_SETTINGS.dailyFormat, getLanguage());
    const path = joinPath(settings.dailyFolder, `${name}.md`);
    const existing = this.vault.getFile(path);
    if (existing) {
      this.openPath(existing.path);
      return;
    }
    let content = '';
    if (settings.dailyTemplate) {
      const template = this.vault.cache.resolve(settings.dailyTemplate, '');
      if (template) content = applyTemplate(await this.vault.read(template), this.templateContext(name, date));
    }
    try {
      const file = await this.vault.create(path, content);
      this.openPath(file.path);
    } catch (error) {
      this.fail(error);
    }
  }

  // --------------------------------------------------------------- editors and templates

  registerEditor(tabId: string, view: EditorView): () => void {
    this.editors.set(tabId, view);
    return () => {
      if (this.editors.get(tabId) === view) this.editors.delete(tabId);
    };
  }

  /** The editor of the active tab, when it shows a note in edit mode. */
  get activeEditor(): EditorView | undefined {
    const tab = activeTab(this.workspace.getState());
    return tab ? this.editors.get(tab.id) : undefined;
  }

  private templateContext(title: string, date = new Date()) {
    const settings = this.settings.getState();
    return {
      title,
      date,
      dateFormat: settings.templateDateFormat,
      timeFormat: settings.templateTimeFormat,
      locale: getLanguage(),
    };
  }

  /** Lets the user pick a template and inserts it at the cursor of the active note. */
  insertTemplate() {
    const target = this.activePath;
    const tab = activeTab(this.workspace.getState());
    if (!target || !tab || !target.endsWith('.md')) return;
    const folder = findTemplatesFolder(this.settings.getState().templatesFolder, this.vault.getFolders());
    if (!folder) {
      this.notify(t('template.noFolder'), 'error');
      return;
    }
    const templates = listTemplates(
      folder,
      this.vault.getMarkdownFiles().map((f) => f.path),
    );
    if (templates.length === 0) {
      this.notify(t('template.none', { folder }), 'error');
      return;
    }
    this.ui.setState({
      finder: {
        mode: 'pick',
        placeholder: t('template.pick'),
        items: templates.map((path) => ({
          id: path,
          label: stem(path),
          detail: dirname(path).slice(folder.length + 1) || undefined,
        })),
        // Follow the tab, not the path: the note may be renamed while the list is open.
        onPick: (path) => void this.applyTemplateTo(path, tab.id),
      },
    });
  }

  private async applyTemplateTo(templatePath: string, tabId: string) {
    try {
      const tab = panes(this.workspace.getState().layout)
        .flatMap((p) => p.tabs)
        .find((t) => t.id === tabId);
      const notePath = tab ? viewPath(tab.view) : null;
      if (!notePath) return;
      const text = applyTemplate(await this.vault.read(templatePath), this.templateContext(stem(notePath)));
      const view = this.editors.get(tabId);
      if (view) {
        view.dispatch(view.state.replaceSelection(text));
        view.focus();
      } else {
        await this.vault.process(notePath, (current) => (current.trim() ? `${current.replace(/\n*$/, '')}\n\n${text}` : text));
      }
    } catch (error) {
      this.fail(error);
    }
  }

  // --------------------------------------------------------------- attachments

  async resourceUrl(path: string): Promise<string> {
    const cached = this.resourceUrls.get(path);
    if (cached) return cached;
    const data = await this.vault.readBinary(path);
    const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mimeType(path) }));
    this.resourceUrls.set(path, url);
    return url;
  }

  private dropResource(path: string) {
    for (const [key, url] of this.resourceUrls) {
      if (isInside(key, path)) {
        URL.revokeObjectURL(url);
        this.resourceUrls.delete(key);
      }
    }
  }

  /** Folder for attachments of a note, with Obsidian's rules. */
  attachmentFolder(sourcePath: string): string {
    const location = this.settings.getState().attachmentLocation || '/';
    if (location === '/') return '';
    if (location === './') return dirname(sourcePath);
    if (location.startsWith('./')) return joinPath(dirname(sourcePath), location.slice(2));
    return normalizePath(location);
  }

  /** Saves a pasted or dropped file next to its note; returns the embed to insert. */
  async saveAttachment(file: File, sourcePath: string): Promise<string> {
    const ext = extname(file.name) || mimeExtension(file.type) || 'bin';
    const baseName =
      stem(file.name) && stem(file.name) !== 'image'
        ? stem(file.name)
        : `Pasted image ${formatDate(new Date(), 'YYYYMMDDHHmmss')}`;
    const path = this.availablePath(this.attachmentFolder(sourcePath), baseName.replace(/[\\/:*?"<>|#^[\]]/g, '-'), ext);
    await this.vault.createBinary(path, new Uint8Array(await file.arrayBuffer()));
    return `![[${this.vault.cache.resolver.linkText(path, sourcePath)}]]`;
  }

  // --------------------------------------------------------------- links

  /** Heading or block location inside a note, as a line range. */
  locate(path: string, subpath: string): { from: number; to: number } | null {
    const meta = this.vault.cache.getMetadata(path);
    const parsed = parseSubpath(subpath);
    if (!meta || !parsed) return null;
    if (parsed.type === 'block') {
      const block = meta.blocks[parsed.id.toLowerCase()];
      return block ? { from: block.startLine, to: block.endLine } : null;
    }
    // Heading chain "#A#B": find B after A.
    let index = -1;
    let level = 0;
    for (const wanted of parsed.headings) {
      const norm = normalizeHeadingText(wanted);
      const found = meta.headings.findIndex((h, i) => i > index && normalizeHeadingText(h.text) === norm);
      if (found === -1) return null;
      index = found;
      level = meta.headings[found]!.level;
    }
    const start = meta.headings[index]!;
    const next = meta.headings.slice(index + 1).find((h) => h.level <= level);
    const text = this.vault.cachedRead(path) ?? '';
    const lastLine = text.split('\n').length - 1;
    return { from: start.line, to: next ? next.line - 1 : lastLine };
  }
}

function normalizeHeadingText(text: string) {
  return text
    .replace(/[#|^:%[\]\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function allViewPaths(state: WorkspaceState): string[] {
  const out: string[] = [];
  const walk = (layout: WorkspaceState['layout']) => {
    if (layout.type === 'pane') {
      for (const tab of layout.pane.tabs) {
        for (const view of [tab.view, ...tab.back, ...tab.forward]) {
          const path = viewPath(view);
          if (path) out.push(path);
        }
      }
    } else layout.children.forEach(walk);
  };
  walk(state.layout);
  return out;
}

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  md: 'text/markdown',
  txt: 'text/plain',
  json: 'application/json',
  canvas: 'application/json',
};

export function mimeType(path: string): string {
  return MIME[extname(path)] ?? 'application/octet-stream';
}

function mimeExtension(type: string): string | undefined {
  return Object.entries(MIME).find(([, mime]) => mime === type)?.[0];
}
