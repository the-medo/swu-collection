import app from './app.ts';

const server = Bun.serve({
  port: process.env.PORT || 3010,
  hostname: '0.0.0.0',
  fetch: app.fetch,
});

console.log('Server running', server.port);
