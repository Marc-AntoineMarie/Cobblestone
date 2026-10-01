import { createRelay } from './relay.ts';

// Run behind a proxy that serves it over HTTPS (wss://), as in docker-compose.yml.
const relay = await createRelay({
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? '0.0.0.0',
});
console.log(`Cobblestone relay on port ${relay.port}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void relay.close().then(() => process.exit(0)));
}
