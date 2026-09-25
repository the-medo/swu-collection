import { startAiExporter } from '../ai/datasets/worker.ts';
import { AiGameRunner } from '../ai/live/runner.ts';
import { CrossfireAiReleases } from '../../server/lib/crossfire/aiReleases.ts';
import { configuredAiInference } from '../ai/releases/inference.ts';
import { listenForCardBundles } from '../storage/card-bundles.ts';
import { CrossfireExits } from '../../server/lib/crossfire/exits.ts';
import { CrossfireChat } from '../../server/lib/crossfire/chat.ts';
import { workerConfig } from './config.ts';
import { CrossfirePractice } from '../../server/lib/crossfire/practice.ts';
import { CrossfireBookmarks } from '../../server/lib/crossfire/bookmarks.ts';
import { CrossfireUndo } from '../../server/lib/crossfire/undo.ts';
import postgres from 'postgres';
import { CrossfireConnections } from '../../server/lib/crossfire/connections.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { GameWorker } from './games.ts';
import { createGameServer } from './server.ts';
import { startFinalizer } from '../history/finalizer.ts';
import { ReplayService } from '../history/replay-service.ts';
import { deliverCrossfireReports } from '../../server/lib/discord/crossfireReports.ts';
import { WorkerMetrics } from './metrics.ts';

if (process.env.CROSSFIRE_ENABLED !== '1') throw new Error('Crossfire is not enabled');
const databaseUrl = process.env.DATABASE_URL,
  origin = process.env.BETTER_AUTH_URL;
const port = Number(process.env.CROSSFIRE_PORT);
if (!databaseUrl || !origin || !Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Crossfire requires DATABASE_URL, BETTER_AUTH_URL and CROSSFIRE_PORT');
// Native pool: the main app's Drizzle client changes JSON/date serialization.
const sql = postgres(databaseUrl, { max: 8, idle_timeout: 20, connect_timeout: 5 });
const stopCardBundles = await listenForCardBundles(sql, () =>
  console.error('Crossfire card bundle preload failed'),
);
const config = workerConfig(process.env);
const worker = new GameWorker(new PostgresGameStore(sql), config.games);
const service = createGameServer(
  worker,
  new CrossfireConnections(sql, origin),
  {
    origin,
    port,
    hostname: process.env.CROSSFIRE_HOST ?? '127.0.0.1',
  },
  undefined,
  new ReplayService(databaseUrl, config.replay),
  new CrossfireUndo(sql),
  new CrossfireBookmarks(sql),
  new CrossfirePractice(sql),
  new CrossfireChat(sql),
  async reportId => {
    const result = await deliverCrossfireReports(sql, { reportId, limit: 1 });
    if (result.failed) throw new Error('Report notification was not delivered');
  },
  new CrossfireExits(sql),
);
const metrics = new WorkerMetrics(sql, worker, () => service.statistics);
const ai = new AiGameRunner(
  sql,
  worker,
  new CrossfireAiReleases(sql, null, configuredAiInference()),
  () => service.livePlayerGames,
  id => service.committed(id),
);
ai.start();
metrics.start();
const stopFinalizer = startFinalizer();
const stopAiExporter = startAiExporter();
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  try {
    const stopMetrics = metrics.stop();
    await ai.stop();
    await service.stop();
    await stopMetrics;
    await stopFinalizer();
    await stopAiExporter();
    await stopCardBundles();
    await sql.end({ timeout: 5 });
    clearTimeout(timeout);
    process.exit(0);
  } catch {
    console.error('Crossfire shutdown failed');
    process.exit(1);
  }
}
process.on('SIGTERM', () => {
  void stop();
});
process.on('SIGINT', () => {
  void stop();
});
console.log(`Crossfire worker listening on port ${service.server.port}`);
