import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** The app's version, as the build sets it (CI writes it into package.json first). */
const version = (JSON.parse(readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf8')) as { version: string }).version;

export default defineConfig({
  root: path.join(import.meta.dirname, 'src/renderer'),
  base: './',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { port: 5174, strictPort: false },
  build: {
    outDir: path.join(import.meta.dirname, 'dist/renderer'),
    emptyOutDir: true,
    target: 'chrome140',
  },
});
