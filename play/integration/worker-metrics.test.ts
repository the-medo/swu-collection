import { afterAll, expect, test } from 'bun:test';
import postgres from 'postgres';
import { PostgresGameStore } from '../storage/postgres.ts';
import { GameWorker } from '../worker/games.ts';
import { WorkerMetrics } from '../worker/metrics.ts';
import { CrossfireOperations } from '../../server/lib/crossfire/operations.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to a local worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Refusing non-worktree database');
const sql = postgres(url, { max: 2, onnotice: () => {} }),
  worker = new GameWorker(new PostgresGameStore(sql), { maxGames: 7 });

afterAll(async () => {
  await worker.stop();
  await sql`DELETE FROM play.worker_metrics WHERE worker_id = ${worker.ownerId}`;
  await sql.end();
});

test('persists aggregate worker, resource and database lifecycle samples', async () => {
  let wallTime = Math.floor(Date.now() / 120_000) * 120_000 + 60_000,
    monotonicTime = 0,
    cpuUsage = 0;
  const metrics = new WorkerMetrics(
    sql,
    worker,
    () => ({
      connections: 4,
      liveConnections: 2,
      replayConnections: 1,
      rooms: 2,
    }),
    {
      now: () => new Date((wallTime += 15_000)),
      databaseTime: false,
      monotonicNow: () => (monotonicTime += 1000),
      resources: async () => ({
        source: 'cgroup-v2',
        memoryUsedBytes: 128 * 1024 ** 2,
        memoryLimitBytes: 512 * 1024 ** 2,
        processRssBytes: 96 * 1024 ** 2,
        heapUsedBytes: 32 * 1024 ** 2,
        cpuUsageMicros: (cpuUsage += 750_000),
        cpuLimitCores: 2,
      }),
    },
  );
  await metrics.sample(3.5);
  await metrics.sample(4.5);
  const rows = await sql`SELECT * FROM play.worker_metrics
    WHERE worker_id = ${worker.ownerId} ORDER BY sampled_at`;
  expect(rows).toHaveLength(2);
  expect(rows[1]).toMatchObject({
    resource_source: 'cgroup-v2',
    memory_used_bytes: '134217728',
    memory_limit_bytes: '536870912',
    cpu_percent: 75,
    event_loop_lag_ms: 4.5,
    loaded_games: 0,
    game_capacity: 7,
    connections: 4,
    live_connections: 2,
    replay_connections: 1,
    rooms: 2,
  });
  const operations = await new CrossfireOperations(sql).status(1);
  expect(operations.online).toBe(true);
  const ownHistory = operations.history.filter(sample => sample.workerId === worker.ownerId);
  expect(ownHistory.at(-1)).toMatchObject({
    workerId: worker.ownerId,
    resourceSource: 'cgroup-v2',
    memoryUsedBytes: 128 * 1024 ** 2,
    cpuPercent: 75,
    gameCapacity: 7,
  });
  expect(ownHistory).toHaveLength(2);
  const dayHistory = (await new CrossfireOperations(sql).status(24)).history.filter(
    sample => sample.workerId === worker.ownerId,
  );
  expect(dayHistory).toHaveLength(1);
  expect(dayHistory[0]?.cpuPercent).toBe(75);

  let resourceReads = 0;
  const firstResourceRead = Promise.withResolvers<void>();
  const databaseClockMetrics = new WorkerMetrics(
    sql,
    worker,
    () => ({
      connections: 0,
      liveConnections: 0,
      replayConnections: 0,
      rooms: 0,
    }),
    {
      now: () => new Date('2000-01-01T00:00:00.000Z'),
      resources: async () => {
        if (++resourceReads === 1) await firstResourceRead.promise;
        return {
          source: 'process',
          memoryUsedBytes: 1,
          memoryLimitBytes: null,
          processRssBytes: 1,
          heapUsedBytes: 1,
          cpuUsageMicros: 1,
          cpuLimitCores: null,
        };
      },
    },
  );
  const firstSample = databaseClockMetrics.sample(1);
  const coalescedSample = databaseClockMetrics.sample(99);
  firstResourceRead.resolve();
  await Promise.all([firstSample, coalescedSample]);
  await databaseClockMetrics.sample(2);
  const [databaseTimed] = await sql<{ sampled_at: Date; event_loop_lag_ms: number }[]>`SELECT
      sampled_at, event_loop_lag_ms
    FROM play.worker_metrics
    WHERE worker_id = ${worker.ownerId} AND resource_source = 'process'
    ORDER BY sampled_at DESC LIMIT 1`;
  expect(Math.abs(Date.now() - databaseTimed!.sampled_at.getTime())).toBeLessThan(5_000);
  expect(databaseTimed!.event_loop_lag_ms).toBe(99);

  await sql`UPDATE play.worker_metrics SET sampled_at = sampled_at - interval '2 hours'
    WHERE worker_id = ${worker.ownerId}`;
  expect((await new CrossfireOperations(sql).status(1)).online).toBe(false);
});
