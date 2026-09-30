import { defineConfig } from '@playwright/test';
import type { Platform } from './tests/recette/lib/cobble';

/*
 * The automated acceptance checklist (docs/RECETTE.md): `npm run e2e`.
 * Project "bureau" drives the Electron app, project "web" the web app in Chrome;
 * each test carries the tags of the platforms its line of the checklist names.
 */
export default defineConfig<{ platform: Platform }>({
  testDir: 'tests/recette',
  testMatch: '*.spec.ts',
  timeout: 30_000,
  expect: { timeout: 6_000 },
  fullyParallel: true,
  // Each test runs a whole app (Electron or Chrome): more at once starves a machine of memory, and
  // timing checks (hover delays, layouts) then fail for no reason. RECETTE_WORKERS=4 on a big machine.
  workers: Number(process.env.RECETTE_WORKERS) || 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['./tests/recette/lib/rapport.ts']],
  use: { trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite preview --config apps/web/vite.config.ts apps/web --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    stdout: 'ignore',
  },
  projects: [
    { name: 'bureau', grep: /@bureau/, use: { platform: 'bureau' } },
    { name: 'web', grep: /@web/, use: { platform: 'web' } },
  ],
});
