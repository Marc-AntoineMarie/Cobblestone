// Builds the web app and serves the build with Vite's preview server (deterministic, unlike the dev
// server which can reload the page while it optimises dependencies). Returns the URL and a stop().
import path from 'node:path';
import { build, preview } from 'vite';

export async function serveWeb() {
  if (process.env.URL) return { url: process.env.URL, stop: async () => {} };
  const config = { configFile: path.resolve('apps/web/vite.config.ts'), root: path.resolve('apps/web'), logLevel: 'warn' };
  await build(config);
  const server = await preview({ ...config, preview: { port: 5199, strictPort: false } });
  return { url: server.resolvedUrls.local[0], stop: () => server.close() };
}
