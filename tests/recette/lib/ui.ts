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

  // ------------------------------------------------------------- the list, the margin, the status bar

  get statusBar() {
    return this.page.locator('.status-bar');
  }
  /** A panel by its id ("backlinks", "outline"…), wherever it is. */
  panel(id: string) {
    return this.page.locator(`.panel[data-panel="${id}"]`);
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
  /** The list of notes, down the left. */
  get rail() {
    return this.page.locator('.desk-list');
  }
  /** One of the list's segments: Récentes, Dossiers, Tags. */
  listTab(name: string) {
    return this.rail.getByRole('tab', { name });
  }
  /** A row of the list, by its name (not by what its excerpt says). */
  listRow(name: string) {
    return this.rail.locator('.list-row').filter({ has: this.page.locator('.list-row-title', { hasText: exact(name) }) });
  }
  get pins() {
    return this.rail.locator('.list-pin');
  }
  /** The button that shows or hides the list. */
  get listToggle() {
    return this.page.getByRole('button', { name: /Masquer la liste|Afficher la liste/ });
  }
  get find() {
    return this.page.locator('.search-field input');
  }
  get findResults() {
    return this.page.locator('.find-results');
  }
  /**
   * Shows the folders in the list (the workbench opens on the recent notes) and
   * returns the tree. On a phone the list has no tree: nothing to do.
   */
  async tree() {
    await this.page.locator('.desk-list, .mobile-workbench').first().waitFor();
    const tab = this.listTab('Dossiers');
    if (await tab.count()) {
      if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
      await this.page.locator('.tree, .tree-empty').first().waitFor();
    }
    return this.page.locator('.tree');
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
  /** The tags of the vault, as the list shows them. */
  get tags() {
    return this.rail.locator('.list-tags');
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
    return this.page.locator('.pane.is-active .tab-content:not([hidden]), .mobile-view');
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
  /** The formatting bar, shown while the note is being written. */
  get toolbar() {
    return this.view.locator('.note-toolbar');
  }
  /** Selects the first word of the note's text that matches. */
  async selectWord(word: string) {
    await this.editor.click();
    await this.editor.evaluate((el, w) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const at = node.textContent!.indexOf(w);
        if (at === -1) continue;
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + w.length);
        const selection = getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }, word);
  }
  /** Counts of the active note, in the status bar. */
  get status() {
    return this.statusBar.locator('.note-status');
  }
  /** The margin's open panel (backlinks, outline, properties or the local graph). */
  get margin() {
    return this.page.locator('.marge-panel');
  }
  /** A button of the margin's rail. */
  marginButton(tab: 'links' | 'outline' | 'properties' | 'graph') {
    return this.page.locator(`.marge-button[data-tab="${tab}"]`);
  }
  /** Opens a panel of the margin and returns it. */
  async openMargin(tab: 'links' | 'outline' | 'properties' | 'graph') {
    if ((await this.marginButton(tab).getAttribute('aria-pressed')) !== 'true') await this.marginButton(tab).click();
    await this.margin.waitFor();
    return this.margin;
  }

  /** Opens a note through the palette, by its name. */
  async open(name: string) {
    await this.page.locator('.workbench, .mobile-workbench').first().waitFor();
    await this.page.keyboard.press('Control+o');
    await this.palette.locator('input').fill(name);
    await this.palette.locator('.finder-item').first().waitFor();
    await this.page.keyboard.press('Enter');
    await expect(this.activeTab).toContainText(name.replace(/\.md$/, '').split('/').pop()!);
  }

  /** Opens a note in a new tab through the palette. */
  async openInNewTab(name: string) {
    await this.page.locator('.workbench, .mobile-workbench').first().waitFor();
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
    if (await this.phone.home.isVisible()) await this.phone.home.getByRole('button', { name: 'Réglages' }).click();
    else await this.page.keyboard.press('Control+,');
    const settings = this.view.locator('.settings-view');
    await settings.waitFor();
    return settings;
  }

  // ------------------------------------------------------------- phone

  /** The phone workbench (≤ 767 px): home, the stacked screen, the search. */
  get phone() {
    const page = this.page;
    const home = page.locator('.mobile-home:not([hidden])');
    const screen = page.locator('.mobile-screen');
    return {
      root: page.locator('.mobile-workbench'),
      home,
      homeTab: (name: string) => home.getByRole('tab', { name }),
      rows: home.locator('.list-row'),
      row: (name: string) => home.locator('.list-row').filter({ has: page.locator('.list-row-title', { hasText: exact(name) }) }),
      pins: home.locator('.list-pin'),
      folderUp: home.locator('.list-folder-up'),
      tags: home.locator('.list-tag'),
      searchPill: home.locator('.mobile-search-pill'),
      newNote: home.locator('.mobile-new'),
      screen,
      back: screen.locator('.mobile-back'),
      tools: screen.locator('.mobile-tools'),
      title: screen.locator('.note-title'),
      sheet: page.locator('.mobile-sheet'),
      search: page.locator('.mobile-search'),
      searchField: page.locator('.mobile-search input'),
      cancelSearch: page.locator('.mobile-cancel'),
      kbBar: page.locator('.mobile-kb'),
      /** The on-screen keyboard, which Chrome's emulation lacks: the visual viewport shrinks as on iOS. */
      keyboard: (open: boolean) =>
        page.evaluate((open) => {
          const vv = window.visualViewport!;
          Object.defineProperty(vv, 'height', { configurable: true, get: () => window.innerHeight - (open ? 336 : 0) });
          vv.dispatchEvent(new Event('resize'));
        }, open),
      /** A long press, as a finger does it. */
      longPress: async (target: Locator) => {
        const box = (await target.boundingBox())!;
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await target.dispatchEvent('pointerdown', { clientX: x, clientY: y, pointerType: 'touch', isPrimary: true });
        await page.waitForTimeout(600);
        await target.dispatchEvent('pointerup', { clientX: x, clientY: y, pointerType: 'touch', isPrimary: true });
      },
    };
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
