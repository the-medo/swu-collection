import { readMcpConfig } from './config.ts';
import { connectMcpDatabase } from './database.ts';
import { createMcpApp } from './app.ts';

const config = readMcpConfig(process.env);
const database = connectMcpDatabase(config.databaseUrl, config.resource, config.callsPerMinute);
await database.repository.health();
const app = createMcpApp(config, database.repository);
const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  fetch: app.fetch,
  maxRequestBodySize: 16_384,
});
console.log(`SWUBASE MCP listening on port ${server.port}`);
const stop = async () => {
  await server.stop(false);
  await database.close();
  process.exit(0);
};
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
