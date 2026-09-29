import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.join(import.meta.dirname, 'src/renderer'),
  base: './',
  plugins: [react()],
  server: { port: 5174, strictPort: false },
  build: {
    outDir: path.join(import.meta.dirname, 'dist/renderer'),
    emptyOutDir: true,
    target: 'chrome140',
  },
});
