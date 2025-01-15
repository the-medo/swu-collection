import app from './app.ts';
import { migrateSwuBase } from './db/migrate.ts';

const server = Bun.serve({
  port: process.env.PORT || 3010,
  hostname: '0.0.0.0',
  fetch: app.fetch,
});

await migrateSwuBase();

console.log('Server running', server.port);
