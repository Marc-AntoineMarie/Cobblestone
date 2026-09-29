// Development: Vite dev server for the renderer, esbuild watch for main and preload, then Electron.
import { context } from 'esbuild';
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import electron from 'electron';
import { copyWindowIcon, mainOptions, preloadOptions } from './build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ configFile: path.join(root, 'vite.config.ts') });
await server.listen();
const url = server.resolvedUrls.local[0];

let child = null;
const restart = () => {
  if (child) child.kill();
  // Editors like VS Code export ELECTRON_RUN_AS_NODE, which would start Electron as plain Node.
  const env = { ...process.env, COBBLESTONE_DEV_SERVER: url };
  delete env.ELECTRON_RUN_AS_NODE;
  child = spawn(electron, ['.'], { cwd: root, stdio: 'inherit', env });
  child.on('exit', (code, signal) => {
    if (signal !== 'SIGTERM') {
      void server.close();
      process.exit(code ?? 0);
    }
  });
};

const restartPlugin = { name: 'restart-electron', setup: (b) => b.onEnd((r) => r.errors.length === 0 && restart()) };
const main = await context({ ...mainOptions, plugins: [restartPlugin] });
await copyWindowIcon();
const preload = await context(preloadOptions);
await preload.rebuild();
await preload.watch();
await main.watch();
