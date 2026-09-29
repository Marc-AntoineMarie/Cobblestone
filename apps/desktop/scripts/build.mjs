// Builds the Electron main process, the preload bridge and the renderer.
import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const mainOptions = {
  entryPoints: [path.join(root, 'src/main/index.ts')],
  outfile: path.join(root, 'dist/main/index.cjs'),
  bundle: true,
  platform: 'node',
  // CommonJS: Electron resolves its built-in "electron" module reliably only through require().
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  sourcemap: true,
  define: { 'import.meta.url': '__import_meta_url' },
  banner: { js: "const __import_meta_url = require('node:url').pathToFileURL(__filename).href;" },
};
export const preloadOptions = {
  entryPoints: [path.join(root, 'src/preload/index.ts')],
  outfile: path.join(root, 'dist/preload/index.cjs'),
  bundle: true,
  platform: 'node',
  // Sandboxed preload scripts must be CommonJS.
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  sourcemap: true,
};

/** The window icon, for systems that take it from the window (Linux on X11, and development). */
export async function copyWindowIcon() {
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await copyFile(path.join(root, 'build/icons/256x256.png'), path.join(root, 'dist/icon.png'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await rm(path.join(root, 'dist'), { recursive: true, force: true });
  await Promise.all([esbuild(mainOptions), esbuild(preloadOptions), copyWindowIcon()]);
  await viteBuild({ configFile: path.join(root, 'vite.config.ts') });
  console.log('Built desktop app into dist/');
}
