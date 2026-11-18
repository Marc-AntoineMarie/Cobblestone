import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { App } from './ui/App';
import type { Platform } from './platform';
import { lockIosAutoZoom } from './viewport';

export type { MovedVault, Platform, UpdateStatus, VaultEntry } from './platform';
export { demoVaultFiles } from './demo-vault';

/** Mounts the whole application into `root` for the given host platform. */
export function mountApp(root: HTMLElement, platform: Platform) {
  lockIosAutoZoom();
  createRoot(root).render(createElement(App, { platform }));
}
