import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf8')) as { version: string };
const version = pkg.version;

/** Stamps the copied sw.js with a build-specific version so browsers invalidate the old cache. */
function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version',
    closeBundle() {
      const out = path.join(import.meta.dirname, 'dist', 'sw.js');
      try {
        const content = readFileSync(out, 'utf8');
        writeFileSync(out, content.replace('__VERSION__', `${version}-${Date.now().toString(36)}`));
      } catch {
        // Dev server: no dist folder, nothing to do.
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { port: 5173 },
  build: { target: 'es2022' },
});
