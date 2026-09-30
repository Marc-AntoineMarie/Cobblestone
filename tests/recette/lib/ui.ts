import { expect, type Locator, type Page } from '@playwright/test';
import type { Cobble } from './cobble';

/**
 * Where things are in Cobblestone's interface. Tests go through here rather than
 * naming CSS classes themselves, so a redesign only changes this file.
 */
export class Ui {
  constructor(private readonly app: Cobble) {}

  get page(): Page {
    return this.app.page;
  }

  // ------------------------------------------------------------- launcher

  get launcher() {
    return this.page.locator('.launcher');
  }
  get recentRows() {
    return this.page.locator('.recent-row');
  }
  recent(name: string) {
    return this.page.locator('.recent-row').filter({ has: this.page.locator('.recent-name', { hasText: exact(name) }) });
  }
  get launcherStatus() {
    return this.page.locator('.launcher-status');
  }
  get lost() {
    return this.page.locator('.lost-vault');
  }
  launchAction(name: RegExp) {
    return this.launcher.locator('.launch-action').filter({ hasText: name });
  }
  /** True when the page scrolls sideways. */
  async overflowsSideways() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  }

  // ------------------------------------------------------------- bars and side zones

  get topBar() {
    return this.page.locator('.top-bar');
  }
  get activityBar() {
    return this.page.locator('.activity-bar');
  }
  get statusBar() {
    return this.page.locator('.status-bar');
  }
  /** A panel by its id ("files", "tags", "backlinks"…), wherever it is. */
  panel(id: string) {
    return this.page.locator(`.panel[data-panel="${id}"]`);
  }
  /** The top bar's button that shows or hides a side zone. */
  sideToggle(side: 'left' | 'right') {
    return this.topBar.getByRole('button', {
      name: `Afficher ou masquer le panneau de ${side === 'left' ? 'gauche' : 'droite'}`,
    });
  }

  get vaultName() {
    return this.page.locator('.vault-name');
  }
  /** Opens the menu of the vault's name, then picks an entry. */
  async vaultMenu(item?: string | RegExp) {
    await this.page.locator('.vault-switch').click();
    await this.menu.waitFor();
    if (item) await this.menuItem(item).click();
  }
  /** The left zone (files, search, bookmarks and tags in the classic layout). */
  get rail() {
    return this.page.locator('.side.is-left');
  }
  get find() {
    return this.page.locator('.search-field input');
  }
  get findResults() {
    return this.page.locator('.find-results');
  }
  /** A row of the file tree, by vault path ("Projets/Plan.md"). */
  row(path: string) {
    return this.page.locator(`.tree-row[data-path="${path.replace(/"/g, '\\"')}"]`);
  }
  get rows() {
    return this.page.locator('.tree-row');
  }
  /** Opens the folders leading to a path in the tree. */
  async expand(path: string) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const folder = this.row(parts.slice(0, i).join('/'));
      if ((await folder.getAttribute('aria-expanded')) !== 'true') await folder.click();
    }
  }
  get tags() {
    return this.panel('tags');
  }
  get bookmarks() {
    return this.panel('bookmarks');
  }

  // ------------------------------------------------------------- panes, tabs, note

  get pane() {
    return this.page.locator('.pane.is-active');
  }
  get panes() {
    return this.page.locator('.pane');
  }
  get tabs() {
    return this.pane.locator('.tab');
  }
  get activeTab() {
    return this.pane.locator('.tab.is-active');
  }
  tab(name: string) {
    return this.pane.locator('.tab').filter({ has: this.page.locator('.tab-title', { hasText: exact(name) }) });
  }
  /** What the active tab of the active pane shows (other tabs stay in the page, hidden). */
  get view() {
    return this.pane.locator('.tab-content:not([hidden])');
  }
  get title() {
    return this.view.locator('.note-title');
  }
  get editor() {
    return this.view.locator('.cm-content');
  }
  get reading() {
    return this.view.locator('.reading-view');
  }
  get noteBar() {
    return this.view.locator('.note-bar');
  }
  /** Counts of the active note, in the status bar. */
  get status() {
    return this.statusBar.locator('.note-status');
  }
  /** The right zone (the note's backlinks, outline, links and properties in the classic layout). */
  get margin() {
    return this.page.locator('.side.is-right');
  }

  /** Opens a note through the palette, by its name. */
  async open(name: string) {
    await this.page.locator('.workbench').waitFor();
    await this.page.keyboard.press('Control+o');
    await this.palette.locator('input').fill(name);
    await this.palette.locator('.finder-item').first().waitFor();
    await this.page.keyboard.press('Enter');
    await expect(this.activeTab).toContainText(name.replace(/\.md$/, '').split('/').pop()!);
  }

  /** Opens a note in a new tab through the palette. */
  async openInNewTab(name: string) {
    await this.page.locator('.workbench').waitFor();
    await this.page.keyboard.press('Control+o');
    await this.palette.locator('input').fill(name);
    await this.palette.locator('.finder-item').first().waitFor();
    await this.page.keyboard.press('Control+Enter');
    await expect(this.activeTab).toContainText(name.split('/').pop()!);
  }

  /** Closes the vault and goes back to the launcher. */
  async switchVault() {
    await this.vaultMenu(/Changer de coffre/);
    await this.launcher.waitFor();
  }

  /** Switches the note to writing (live preview) or reading. */
  async mode(which: 'Écrire' | 'Lire') {
    await this.noteBar.getByRole('button', { name: which, exact: true }).click();
  }

  /** Puts the cursor at the end of line n (0 is the first line). */
  async gotoLine(n: number) {
    await this.editor.click();
    await this.page.keyboard.press('Control+Home');
    for (let i = 0; i < n; i++) await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('End');
  }

  /** The drawn lines of the editor. */
  get lines() {
    return this.editor.locator('.cm-line');
  }

  /** Text of the whole document, as the editor holds it. */
  async doc(): Promise<string> {
    return this.pane.locator('.cm-content').evaluate((el) => {
      const view = (el as unknown as { cmView?: { view: { state: { doc: { toString(): string } } } } }).cmView?.view;
      return view ? view.state.doc.toString() : (el as HTMLElement).innerText;
    });
  }

  /** Puts the cursor at the end of the note's text. */
  async editEnd() {
    await this.editor.click();
    await this.page.keyboard.press('Control+End');
  }

  /** Types at the end of the note, then waits for the save. */
  async append(text: string) {
    await this.editEnd();
    await this.page.keyboard.type(text);
  }

  /** Pastes files into the note, as from the clipboard (a screenshot…). */
  async pasteFiles(files: { name: string; type: string; bytes: Uint8Array }[]) {
    const payload = files.map((f) => ({ name: f.name, type: f.type, data: Buffer.from(f.bytes).toString('base64') }));
    await this.editor.evaluate((target, files) => {
      const transfer = new DataTransfer();
      for (const f of files) {
        transfer.items.add(new File([Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0))], f.name, { type: f.type }));
      }
      target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
    }, payload);
  }

  /** Drops files from the system's file manager onto an element. */
  async dropFiles(target: Locator, files: { name: string; type: string; bytes: Uint8Array }[]) {
    const payload = files.map((f) => ({ name: f.name, type: f.type, data: Buffer.from(f.bytes).toString('base64') }));
    const box = (await target.boundingBox())!;
    await target.evaluate(
      (element, { files, x, y }) => {
        const transfer = new DataTransfer();
        for (const f of files) {
          transfer.items.add(new File([Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0))], f.name, { type: f.type }));
        }
        for (const type of ['dragenter', 'dragover', 'drop']) {
          element.dispatchEvent(
            new DragEvent(type, { dataTransfer: transfer, bubbles: true, cancelable: true, clientX: x, clientY: y }),
          );
        }
      },
      { files: payload, x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, 40) },
    );
  }

  /** Opens the settings tab. */
  async settings() {
    await this.page.keyboard.press('Control+,');
    const settings = this.view.locator('.settings-view');
    await settings.waitFor();
    return settings;
  }

  // ------------------------------------------------------------- floating layers

  get palette() {
    return this.page.locator('.finder');
  }
  get menu() {
    return this.page.locator('.menu');
  }
  menuItem(name: string | RegExp) {
    return this.page.getByRole('menuitem', { name });
  }
  /** Opens the context menu of a tree row, then picks an entry. */
  async contextMenu(path: string, item?: string | RegExp) {
    await this.row(path).click({ button: 'right' });
    await this.menu.waitFor();
    if (item) await this.menuItem(item).click();
  }
  get toasts() {
    return this.page.locator('.toast');
  }
  get preview() {
    return this.page.locator('.hover-preview');
  }
  /**
   * Hovers until the hover preview shows. On a loaded machine, the element can
   * be redrawn under the pointer before the preview's delay runs out; a real
   * reader moves the mouse again, so the test hovers again.
   */
  async hoverForPreview(target: Locator) {
    await expect(async () => {
      await this.page.mouse.move(1, 1);
      await target.hover();
      await expect(this.preview).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 12_000 });
  }
  get share() {
    return this.page.locator('.share-sheet');
  }

  /** Runs a command from the command palette by its name. */
  async command(name: string) {
    await this.page.keyboard.press('Control+p');
    await this.palette.locator('input').fill(`>${name}`);
    await this.palette.locator('.finder-item').first().waitFor();
    await this.page.keyboard.press('Enter');
  }
}

/** A regular expression matching exactly this text. */
export function exact(text: string) {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}
