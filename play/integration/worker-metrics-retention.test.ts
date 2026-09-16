import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres, { type Sql, type TransactionSql } from 'postgres';
import { compactWorkerMetrics } from '../storage/worker-metrics.ts';
import { CrossfireOperations } from '../../server/lib/crossfire/operations.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to a local worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Refusing non-worktree database');
const sql = postgres(url, { max: 2, onnotice: () => {} });
const ids: string[] = [];
const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

function workerId() {
  const id = `metrics-retention-${randomUUID()}`;
  ids.push(id);
  return id;
}
function sample(id: string, at: number, cpu = 10, memory = 100) {
  return {
    worker_id: id,
    sampled_at: new Date(at),
    started_at: new Date(at - hourMs),
    resource_source: 'cgroup-v2',
    memory_used_bytes: memory,
    memory_limit_bytes: 1000,
    process_rss_bytes: 80,
    heap_used_bytes: 40,
    cpu_percent: cpu,
    cpu_limit_cores: 2,
    event_loop_lag_ms: 1,
    running_games: 5,
    active_games: 3,
    loaded_games: 2,
    loading_games: 0,
    attached_games: 2,
    busy_games: 0,
    queued_operations: 0,
    game_capacity: 128,
    connections: 4,
    live_connections: 4,
    replay_connections: 0,
    rooms: 2,
    ended_games: 0,
    pending_statistics: 0,
  };
}
async function databaseHour() {
  const [row] = await sql<{ now: Date }[]>`SELECT date_trunc('hour', statement_timestamp()) AS now`;
  return row!.now.getTime();
}

afterAll(async () => {
  await sql`DELETE FROM play.worker_metrics WHERE worker_id = ANY(${ids})`;
  await sql`DELETE FROM play.worker_metric_rollups WHERE worker_id = ANY(${ids})`;
  await sql.end();
});

test('retains recent samples and compacts older samples through both tiers without losing peaks', async () => {
  const id = workerId(),
    other = workerId(),
    now = await databaseHour();
  const recent = now - dayMs,
    monthly = now - 8 * dayMs,
    old = now - 400 * dayMs;
  await sql`INSERT INTO play.worker_metrics ${sql([
    sample(id, recent),
    sample(id, monthly + 15_000, 80, 100),
    sample(id, monthly + 30_000, 20, 300),
    sample(id, old + 15_000, 95, 100),
    sample(id, old + 600_000, 20, 500),
    sample(other, monthly + 15_000, 15, 50),
  ])}`;
  expect(await compactWorkerMetrics(sql)).toBe(true);
  const raw = await sql`SELECT * FROM play.worker_metrics WHERE worker_id = ${id}`;
  expect(raw).toHaveLength(1);
  expect(raw[0]!.sampled_at.getTime()).toBe(recent);
  const rollups = await sql`SELECT * FROM play.worker_metric_rollups
    WHERE worker_id = ${id} ORDER BY bucket_seconds`;
  expect(rollups).toHaveLength(2);
  expect(rollups[0]).toMatchObject({
    bucket_seconds: 600,
    cpu_percent: 80,
    memory_used_bytes: '300',
  });
  expect(rollups[1]).toMatchObject({
    bucket_seconds: 3600,
    cpu_percent: 95,
    memory_used_bytes: '500',
  });
  expect(rollups[0]!.sampled_at.getTime()).toBe(monthly + 30_000);
  expect(rollups[1]!.sampled_at.getTime()).toBe(old + 600_000);
  const ownHistory = (await new CrossfireOperations(sql).status('all')).history.filter(
    point => point.workerId === id,
  );
  expect(ownHistory).toHaveLength(3);
  expect(ownHistory[0]?.cpuPercent).toBe(95);
  expect(
    (await new CrossfireOperations(sql).status(720)).history.filter(point => point.workerId === id),
  ).toHaveLength(2);
  expect(
    (await new CrossfireOperations(sql).status(8760)).history.filter(
      point => point.workerId === id,
    ),
  ).toHaveLength(2);
  expect(await compactWorkerMetrics(sql)).toBe(true);
  const repeated = await sql`SELECT * FROM play.worker_metric_rollups
    WHERE worker_id = ${id} ORDER BY bucket_seconds`;
  expect([...repeated]).toEqual([...rollups]);

  // A late/backfilled sample merges into an existing bucket without overwriting its peaks.
  await sql`INSERT INTO play.worker_metrics ${sql([
    sample(id, monthly + 45_000, 90, 50),
    sample(id, old + 700_000, 99, 50),
  ])}`;
  await compactWorkerMetrics(sql);
  const merged = await sql`SELECT * FROM play.worker_metric_rollups
    WHERE worker_id = ${id} ORDER BY bucket_seconds`;
  expect(merged).toHaveLength(2);
  expect(merged[0]).toMatchObject({ cpu_percent: 90, memory_used_bytes: '300' });
  expect(merged[1]).toMatchObject({ cpu_percent: 99, memory_used_bytes: '500' });
  expect(
    await sql`SELECT * FROM play.worker_metric_rollups WHERE worker_id = ${other}`,
  ).toHaveLength(1);
});

test('keeps a partially aged bucket at its original resolution', async () => {
  const id = workerId();
  const [cutoff] = await sql<{ raw: Date; hourly: Date }[]>`SELECT
    date_bin(interval '10 minutes', statement_timestamp() - interval '7 days', timestamptz 'epoch') AS raw,
    date_bin(interval '1 hour', statement_timestamp() - interval '30 days', timestamptz 'epoch') AS hourly`;
  await sql`INSERT INTO play.worker_metrics ${sql([
    sample(id, cutoff!.raw.getTime()),
    sample(id, cutoff!.hourly.getTime()),
  ])}`;
  await compactWorkerMetrics(sql);
  expect(await sql`SELECT * FROM play.worker_metrics WHERE worker_id = ${id}`).toHaveLength(1);
  const rollups = await sql`SELECT * FROM play.worker_metric_rollups WHERE worker_id = ${id}`;
  expect(rollups).toHaveLength(1);
  expect(rollups[0]!.bucket_seconds).toBe(600);
});

test('rolls back sample removal if a maintenance transaction cannot commit', async () => {
  const id = workerId(),
    at = (await databaseHour()) - 40 * dayMs;
  await sql`INSERT INTO play.worker_metrics ${sql(sample(id, at, 42))}`;
  const interrupted = {
    begin: (run: (tx: TransactionSql) => Promise<unknown>) =>
      sql.begin(async tx => {
        await run(tx);
        throw new Error('Simulated interruption before commit');
      }),
  } as unknown as Sql;
  await expect(compactWorkerMetrics(interrupted)).rejects.toThrow('Simulated interruption');
  expect(await sql`SELECT * FROM play.worker_metrics WHERE worker_id = ${id}`).toHaveLength(1);
  expect(await sql`SELECT * FROM play.worker_metric_rollups WHERE worker_id = ${id}`).toHaveLength(
    0,
  );
  await compactWorkerMetrics(sql);
  expect(await sql`SELECT * FROM play.worker_metrics WHERE worker_id = ${id}`).toHaveLength(0);
  expect(await sql`SELECT * FROM play.worker_metric_rollups WHERE worker_id = ${id}`).toHaveLength(
    1,
  );
});

test('skips concurrent maintenance without waiting on another worker', async () => {
  await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('crossfire-worker-metrics-retention'))`;
    expect(await compactWorkerMetrics(sql)).toBe(false);
  });
});
