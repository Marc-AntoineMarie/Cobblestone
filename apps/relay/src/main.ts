import path from 'node:path';
import { Accounts } from './accounts.ts';
import { mailerFromEnv } from './mail.ts';
import { createRelay } from './relay.ts';

// Run behind a proxy that serves it over HTTPS (wss://): see docs/RELAIS.md.
const accounts = await Accounts.open(path.join(process.env.DATA_DIR ?? 'data', 'accounts.json'), mailerFromEnv());
const relay = await createRelay({
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? '0.0.0.0',
  accounts,
  dailyCap: Number(process.env.DAILY_CAP_GB ?? 30) * 1024 ** 3,
});
console.log(`Cobblestone relay on port ${relay.port}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void relay.close().then(() => process.exit(0)));
}
