// Smoke test of the built desktop app: node scripts/shoot-desktop.mjs <out-dir>
import { _electron as electron } from 'playwright-core';
import path from 'node:path';

const out = process.argv[2] ?? 'shots';
const app = await electron.launch({
  executablePath: path.resolve('node_modules/electron/dist/electron'),
  args: [path.resolve('apps/desktop')],
  env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE')),
});
const errors = [];
const window = await app.firstWindow();
window.on('pageerror', (e) => errors.push(e.message));
window.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await window.waitForTimeout(1500);
await window.screenshot({ path: `${out}/desktop-launcher.png` });
await window.getByRole('button', { name: /Essayer la démo|Try the demo/ }).click();
await window.waitForTimeout(1200);
await window.screenshot({ path: `${out}/desktop-demo.png` });
await app.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
