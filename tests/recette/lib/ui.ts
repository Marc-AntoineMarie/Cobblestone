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

  // ------------------------------------------------------------- sidebar

  get vaultName() {
    return this.page.locator('.vault-name');
  }
  /** Opens the menu of the vault's name, then picks an entry. */
  async vaultMenu(item?: string | RegExp) {
    await this.page.locator('.vault-switch').click();
    await this.menu.waitFor();
    if (item) await this.menuItem(item).click();
  }
  get rail() {
    return this.page.locator('.rail');
  }
  get find() {
    return this.page.locator('.rail-find input');
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
    return this.page.locator('.rail-tags');
  }
  get bookmarks() {
    return this.page.locator('.rail-bookmarks');
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
  get title() {
    return this.pane.locator('.note-title');
  }
  get editor() {
    return this.pane.locator('.cm-content');
  }
  get reading() {
    return this.pane.locator('.reading-view');
  }
  get noteBar() {
    return this.pane.locator('.note-bar');
  }
  get status() {
    return this.pane.locator('.note-status');
  }
  get margin() {
    return this.page.locator('.margin');
  }

  /** Opens a note through the palette, by its name. */
  async open(name: string) {
    await this.vaultName.waitFor();
    await this.page.keyboard.press('Control+o');
    await this.palette.locator('input').fill(name);
    await this.palette.locator('.finder-item').first().waitFor();
    await this.page.keyboard.press('Enter');
    await expect(this.activeTab).toContainText(name.replace(/\.md$/, '').split('/').pop()!);
  }

  /** Opens a note in a new tab through the palette. */
  async openInNewTab(name: string) {
    await this.vaultName.waitFor();
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
