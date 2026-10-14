import { migrateSwuBase } from './db/migrate.ts';

// OAuth resource registration runs during auth initialization. All schema must
// exist before importing the app or admitting HTTP traffic.
await migrateSwuBase();
const { default: app, bunWebsocket } = await import('./app.ts');
const { getCrossfireServices } = await import('./routes/crossfire.ts');

const server = Bun.serve({
  port: process.env.PORT || 3010,
  hostname: process.env.HOST || '0.0.0.0',
  fetch: app.fetch,
  websocket: bunWebsocket,
});

if (process.env.CROSSFIRE_ENABLED === '1') await getCrossfireServices().invitations.start();

console.log('Server running', server.port);
