import { getCrossfireServices } from './routes/crossfire.ts';
import app, { bunWebsocket } from './app.ts';
import { migrateSwuBase } from './db/migrate.ts';

const server = Bun.serve({
  port: process.env.PORT || 3010,
  hostname: process.env.HOST || '0.0.0.0',
  fetch: app.fetch,
  websocket: bunWebsocket,
});

await migrateSwuBase();
if (process.env.CROSSFIRE_ENABLED === '1') await getCrossfireServices().invitations.start();

console.log('Server running', server.port);
