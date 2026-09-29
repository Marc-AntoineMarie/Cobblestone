import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { App } from './ui/App';
import type { Platform } from './platform';

export type { MovedVault, Platform, VaultEntry } from './platform';
export { demoVaultFiles } from './demo-vault';

/** Mounts the whole application into `root` for the given host platform. */
export function mountApp(root: HTMLElement, platform: Platform) {
  createRoot(root).render(createElement(App, { platform }));
}
