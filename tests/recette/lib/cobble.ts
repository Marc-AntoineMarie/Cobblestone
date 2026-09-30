import { _electron as electron, type Browser, type BrowserContext, type ElectronApplication, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** The two test projects: the desktop app (Electron) and the web app (Chrome). */
export type Platform = 'bureau' | 'web';

/** Vault content: vault path → text or bytes. */
export type Files = Record<string, string | Uint8Array>;

export interface StartOptions {
  /** Files of the vault to open; "demo" opens the demo; null stays on the launcher. */
  vault?: Files | 'demo' | null;
  /** Vault name (desktop folder name, web vault name). */
  name?: string;
  /** Interface language through the system locale. */
  lang?: 'fr' | 'en';
  /** Window size. */
  viewport?: { width: number; height: number };
  /** App preferences stored before launch (theme, language). */
  preferences?: Record<string, unknown>;
  /** false: the vault is only listed on the launcher, not reopened. */
  open?: boolean;
  /** Web: a browser without the File System Access API (Firefox, Safari). */
  withoutFolderAccess?: boolean;
  /** Desktop: more entries in the recent list, pointing wherever they like. */
  recents?: { id: string; name: string; location: string }[];
}

const WEB_URL = process.env.RECETTE_URL ?? 'http://localhost:5199';
const ELECTRON = path.resolve('node_modules/electron/dist/electron');
const DESKTOP_APP = path.resolve('apps/desktop');

/**
 * Drives one Cobblestone instance for a test, on either platform, with the
 * same calls: start on a vault, read and change its files from outside, restart.
 */
export class Cobble {
  page!: Page;
  /** Uncaught errors of the page; a test fails if any remain. */
  readonly errors: string[] = [];
  /** Desktop: folder of the vault and of the app data. */
  root = '';
  userData = '';
  private electronApp: ElectronApplication | null = null;
  private context: BrowserContext | null = null;
  private tmp = '';
  private options: StartOptions = {};
  /** Web: folders leading to the vault in the browser's private storage. */
  private webRoot = ['vaults', 'recette'];

  constructor(
    readonly platform: Platform,
    private readonly browser: Browser | null,
  ) {}

  get desktop() {
    return this.platform === 'bureau';
  }

  /** Modifier of the app's shortcuts (Ctrl here; the tests run on Linux). */
  readonly mod = 'Control';

  /** Shortcuts the browser keeps for itself have an Alt variant on the web. */
  key(name: 'newNote' | 'closeTab'): string {
    if (name === 'newNote') return this.desktop ? 'Control+n' : 'Alt+n';
    return this.desktop ? 'Control+w' : 'Alt+w';
  }

  async start(options: StartOptions = {}) {
    this.options = options;
    this.tmp = await mkdtemp(path.join(tmpdir(), 'cobblestone-recette-'));
    const vault = options.vault === undefined ? null : options.vault;
    if (this.desktop) await this.startDesktop(vault);
    else await this.startWeb(vault);
    if (vault === 'demo') await this.page.getByRole('button', { name: /Essayer la démo|Try the demo/ }).click();
    if (vault && options.open !== false) await this.page.locator('.workbench').waitFor();
    return this;
  }

  private async startDesktop(vault: StartOptions['vault']) {
    this.userData = path.join(this.tmp, 'userdata');
    await mkdir(this.userData, { recursive: true });
    const storage: Record<string, unknown> = {};
    if (this.options.preferences) storage.preferences = this.options.preferences;
    const recents: object[] = (this.options.recents ?? []).map((r, i) => ({
      ...r,
      kind: 'folder',
      lastOpened: Date.now() - 1000 * (i + 1),
    }));
    if (vault && vault !== 'demo') {
      this.root = path.join(this.tmp, this.options.name ?? 'Coffre');
      await mkdir(this.root, { recursive: true });
      await this.writeAll(vault);
      recents.unshift({ id: 'v1', name: path.basename(this.root), kind: 'folder', location: this.root, lastOpened: Date.now() });
      if (this.options.open !== false) storage.lastVault = 'v1';
    }
    await writeFile(path.join(this.userData, 'vaults.json'), JSON.stringify(recents));
    await writeFile(path.join(this.userData, 'storage.json'), JSON.stringify(storage));
    await this.launchElectron();
  }

  private async launchElectron() {
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE')) as Record<
      string,
      string
    >;
    env.COBBLESTONE_USER_DATA = this.userData;
    env.LANG = this.options.lang === 'en' ? 'en_US.UTF-8' : 'fr_FR.UTF-8';
    env.LANGUAGE = this.options.lang ?? 'fr';
    const args = [DESKTOP_APP, ...(process.env.CI ? ['--no-sandbox'] : [])];
    this.electronApp = await electron.launch({ executablePath: ELECTRON, args, env });
    this.page = await this.electronApp.firstWindow();
    this.watch(this.page);
    if (this.options.viewport) await this.resize(this.options.viewport);
    await this.page.waitForLoadState('domcontentloaded');
  }

  private async startWeb(vault: StartOptions['vault']) {
    this.context = await this.browser!.newContext({
      viewport: this.options.viewport ?? { width: 1280, height: 800 },
      locale: this.options.lang === 'en' ? 'en-US' : 'fr-FR',
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    this.page = await this.context.newPage();
    this.watch(this.page);
    if (this.options.withoutFolderAccess) {
      await this.page.addInitScript(() => Object.defineProperty(window, 'showDirectoryPicker', { value: undefined }));
    }
    await this.page.goto(WEB_URL);
    await this.page.locator('.launcher, .workbench').first().waitFor();
    if (this.options.preferences || (vault && vault !== 'demo')) {
      const files = vault && vault !== 'demo' ? await this.encode(vault) : null;
      await this.page.evaluate(
        async ({ id, name, files, preferences, open }) => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('cobblestone');
            request.onupgradeneeded = () => request.result.createObjectStore('kv');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          const put = (key: string, value: unknown) =>
            new Promise<void>((resolve, reject) => {
              const tx = db.transaction('kv', 'readwrite');
              tx.objectStore('kv').put(value, key);
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            });
          if (preferences) await put('storage:preferences', preferences);
          if (files) {
            const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('vaults', { create: true });
            const dir = await root.getDirectoryHandle(id, { create: true });
            for (const [filePath, [kind, data]] of Object.entries(files)) {
              const parts = filePath.split('/');
              let folder = dir;
              for (const part of parts.slice(0, -1)) folder = await folder.getDirectoryHandle(part, { create: true });
              const handle = await folder.getFileHandle(parts[parts.length - 1]!, { create: true });
              const writable = await handle.createWritable();
              await writable.write(kind === 'text' ? data : Uint8Array.from(atob(data), (c) => c.charCodeAt(0)));
              await writable.close();
            }
            await put('vaults', [{ id, name, kind: 'browser', lastOpened: Date.now() }]);
            if (open) await put('storage:lastVault', id);
          }
          db.close();
        },
        {
          id: this.webRoot[1]!,
          name: this.options.name ?? 'Coffre',
          files,
          preferences: this.options.preferences ?? null,
          open: this.options.open !== false,
        },
      );
      await this.page.reload();
    }
  }

  private watch(page: Page) {
    page.on('pageerror', (error) => this.errors.push(error.message));
  }

  /** Text as is, bytes as base64, so they cross into the page. */
  private async encode(files: Files) {
    return Object.fromEntries(
      Object.entries(files).map(([p, data]) => [
        p,
        typeof data === 'string' ? ['text', data] : ['base64', Buffer.from(data).toString('base64')],
      ]),
    ) as Record<string, [string, string]>;
  }

  private async writeAll(files: Files) {
    for (const [p, data] of Object.entries(files)) await this.write(p, data);
  }

  async resize(size: { width: number; height: number }) {
    if (this.desktop) {
      await this.electronApp!.evaluate(({ BrowserWindow }, s) => {
        const window = BrowserWindow.getAllWindows()[0]!;
        window.setMinimumSize(200, 200);
        window.setContentSize(s.width, s.height);
      }, size);
      // The window manager takes its time: wait until the page has the new size.
      await this.page
        .waitForFunction(
          (s) => Math.abs(window.innerWidth - s.width) <= 2 && Math.abs(window.innerHeight - s.height) <= 2,
          size,
          { timeout: 8000 },
        )
        .catch(() => undefined);
    } else await this.page.setViewportSize(size);
  }

  // ------------------------------------------------------------- the vault's files, from outside the app

  async read(p: string): Promise<string> {
    if (this.desktop) return readFile(path.join(this.root, p), 'utf8');
    return this.page.evaluate(
      async ({ root, p }) => {
        let dir = await navigator.storage.getDirectory();
        for (const part of root) dir = await dir.getDirectoryHandle(part);
        const parts = p.split('/');
        for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
        return (await (await dir.getFileHandle(parts[parts.length - 1]!)).getFile()).text();
      },
      { root: this.webRoot, p },
    );
  }

  /** Reads a file, or '' when it does not exist (yet). */
  async readOr(p: string): Promise<string> {
    return this.read(p).catch(() => '');
  }

  async readBytes(p: string): Promise<Uint8Array> {
    if (this.desktop) return new Uint8Array(await readFile(path.join(this.root, p)));
    const base64 = await this.page.evaluate(
      async ({ root, p }) => {
        let dir = await navigator.storage.getDirectory();
        for (const part of root) dir = await dir.getDirectoryHandle(part);
        const parts = p.split('/');
        for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
        const bytes = new Uint8Array(await (await (await dir.getFileHandle(parts[parts.length - 1]!)).getFile()).arrayBuffer());
        return btoa(String.fromCharCode(...bytes));
      },
      { root: this.webRoot, p },
    );
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  }

  async exists(p: string): Promise<boolean> {
    if (this.desktop) return existsSync(path.join(this.root, p));
    return this.page.evaluate(
      async ({ root, p }) => {
        try {
          let dir = await navigator.storage.getDirectory();
          for (const part of root) dir = await dir.getDirectoryHandle(part);
          const parts = p.split('/').filter(Boolean);
          for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
          const last = parts[parts.length - 1]!;
          try {
            await dir.getFileHandle(last);
          } catch {
            await dir.getDirectoryHandle(last);
          }
          return true;
        } catch {
          return false;
        }
      },
      { root: this.webRoot, p },
    );
  }

  /** Every file of the vault, hidden ones included, sorted. */
  async list(): Promise<string[]> {
    if (this.desktop) {
      const entries = await readdir(this.root, { recursive: true, withFileTypes: true });
      return entries
        .filter((e) => e.isFile())
        .map((e) => path.relative(this.root, path.join(e.parentPath, e.name)).split(path.sep).join('/'))
        .sort();
    }
    return this.page.evaluate(async (root) => {
      const out: string[] = [];
      const walk = async (dir: FileSystemDirectoryHandle, prefix: string) => {
        for await (const [name, handle] of (
          dir as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }
        ).entries()) {
          if (handle.kind === 'file') out.push(prefix + name);
          else await walk(handle as FileSystemDirectoryHandle, `${prefix}${name}/`);
        }
      };
      let dir = await navigator.storage.getDirectory();
      for (const part of root) dir = await dir.getDirectoryHandle(part);
      await walk(dir, '');
      return out.sort();
    }, this.webRoot);
  }

  /** Writes a file as another program would. */
  async write(p: string, data: string | Uint8Array) {
    if (this.desktop) {
      const target = path.join(this.root, p);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data);
      return;
    }
    const [kind, payload] = typeof data === 'string' ? ['text', data] : ['base64', Buffer.from(data).toString('base64')];
    await this.page.evaluate(
      async ({ root, p, kind, payload }) => {
        let dir = await navigator.storage.getDirectory();
        for (const part of root) dir = await dir.getDirectoryHandle(part);
        const parts = p.split('/');
        for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part, { create: true });
        const writable = await (await dir.getFileHandle(parts[parts.length - 1]!, { create: true })).createWritable();
        await writable.write(kind === 'text' ? payload : Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)));
        await writable.close();
      },
      { root: this.webRoot, p, kind, payload },
    );
  }

  /** Deletes a file or folder as another program would. */
  async remove(p: string) {
    if (this.desktop) return rm(path.join(this.root, p), { recursive: true, force: true });
    await this.page.evaluate(
      async ({ root, p }) => {
        let dir = await navigator.storage.getDirectory();
        for (const part of root) dir = await dir.getDirectoryHandle(part);
        const parts = p.split('/');
        for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
        await dir.removeEntry(parts[parts.length - 1]!, { recursive: true });
      },
      { root: this.webRoot, p },
    );
  }

  /** Renames a file as another program would (desktop: a real rename; web: copy then delete). */
  async move(from: string, to: string) {
    if (this.desktop) {
      await mkdir(path.dirname(path.join(this.root, to)), { recursive: true });
      return rename(path.join(this.root, from), path.join(this.root, to));
    }
    await this.write(to, await this.readBytes(from));
    await this.remove(from);
  }

  // ------------------------------------------------------------- app lifecycle

  /**
   * Quits and starts again on the same data (desktop), or reloads the page (web).
   * `meanwhile` runs while the desktop app is closed.
   */
  async restart(meanwhile?: () => Promise<unknown>) {
    if (this.desktop) {
      await this.electronApp!.close();
      await meanwhile?.();
      await this.launchElectron();
    } else {
      await meanwhile?.();
      await this.page.reload();
    }
    await this.page.locator('.launcher, .workbench').first().waitFor();
  }

  /** Web: clears everything the site stored (« Clear site data »), then reloads. */
  async clearSiteData() {
    const cdp = await this.context!.newCDPSession(this.page);
    await cdp.send('Storage.clearDataForOrigin', { origin: new URL(WEB_URL).origin, storageTypes: 'all' });
    await this.page.reload();
    await this.page.locator('.launcher, .workbench').first().waitFor();
  }

  /** Desktop: the next folder dialogs answer with this folder (null: cancelled). */
  async answerFolderDialog(folder: string | null) {
    await this.electronApp!.evaluate(({ dialog }, target) => {
      const counter = globalThis as { __folderDialogs?: number };
      dialog.showOpenDialog = (async () => {
        counter.__folderDialogs = (counter.__folderDialogs ?? 0) + 1;
        return { canceled: target === null, filePaths: target ? [target] : [] };
      }) as typeof dialog.showOpenDialog;
    }, folder);
  }

  /**
   * Web: the next « Ouvrir un dossier » gets a real folder with these files, as
   * if the user had picked it (a folder of the origin's private storage stands in
   * for a folder on disk). The file helpers then work in that folder.
   */
  async pickFolderWith(name: string, files: Files) {
    this.webRoot = ['picked', name];
    const encoded = await this.encode(files);
    await this.page.evaluate(
      async ({ name, files }) => {
        let dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('picked', { create: true });
        dir = await dir.getDirectoryHandle(name, { create: true });
        for (const [filePath, [kind, data]] of Object.entries(files)) {
          const parts = filePath.split('/');
          let folder = dir;
          for (const part of parts.slice(0, -1)) folder = await folder.getDirectoryHandle(part, { create: true });
          const writable = await (await folder.getFileHandle(parts[parts.length - 1]!, { create: true })).createWritable();
          await writable.write(kind === 'text' ? data : Uint8Array.from(atob(data), (c) => c.charCodeAt(0)));
          await writable.close();
        }
        (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker = async () =>
          dir;
      },
      { name, files: encoded },
    );
  }

  /** Web: the browser refuses (or grants) write access to picked folders. */
  async folderPermission(state: 'granted' | 'denied') {
    await this.page.evaluate((state) => {
      const proto = FileSystemHandle.prototype as unknown as Record<string, unknown>;
      proto.queryPermission = async () => (state === 'granted' ? 'granted' : 'prompt');
      proto.requestPermission = async () => state;
    }, state);
  }

  /** Desktop: how many folder dialogs were answered by answerFolderDialog. */
  async folderDialogs(): Promise<number> {
    return this.electronApp!.evaluate(() => (globalThis as { __folderDialogs?: number }).__folderDialogs ?? 0);
  }

  /** Desktop: runs code in the main process. */
  get electron(): ElectronApplication {
    return this.electronApp!;
  }

  /** Desktop: makes a folder with these files outside the vault; returns its path. */
  async folder(relative: string, files: Files = {}) {
    const target = path.join(this.tmp, relative);
    await mkdir(target, { recursive: true });
    for (const [p, data] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(target, p)), { recursive: true });
      await writeFile(path.join(target, p), data);
    }
    return target;
  }

  /** Text in the system clipboard. */
  async clipboard(): Promise<string> {
    if (this.desktop) return this.electronApp!.evaluate(({ clipboard }) => clipboard.readText());
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  /** Makes a note unreadable: file permissions on the desktop, a refusing file handle on the web. */
  async makeUnreadable(p: string) {
    if (this.desktop) {
      const { chmod } = await import('node:fs/promises');
      await chmod(path.join(this.root, p), 0o000);
      return;
    }
    await this.page.evaluate((name) => {
      const proto = FileSystemFileHandle.prototype;
      const getFile = proto.getFile;
      proto.getFile = function (this: FileSystemFileHandle) {
        if (this.name === name) return Promise.reject(new DOMException('refused', 'NotAllowedError'));
        return getFile.call(this);
      };
    }, p.split('/').pop()!);
  }

  /** A scratch folder outside the vault, removed after the test. */
  get scratch() {
    return this.tmp;
  }

  async close() {
    await this.electronApp?.close().catch(() => undefined);
    await this.context?.close().catch(() => undefined);
    if (this.tmp) await rm(this.tmp, { recursive: true, force: true }).catch(() => undefined);
  }
}
