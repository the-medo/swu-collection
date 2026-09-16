import type { Sql } from 'postgres';

const latestColumns = [
  'started_at',
  'resource_source',
  'memory_limit_bytes',
  'cpu_limit_cores',
  'game_capacity',
];
const peakColumns = [
  'memory_used_bytes',
  'process_rss_bytes',
  'heap_used_bytes',
  'cpu_percent',
  'event_loop_lag_ms',
  'running_games',
  'active_games',
  'loaded_games',
  'loading_games',
  'attached_games',
  'busy_games',
  'queued_operations',
  'connections',
  'live_connections',
  'replay_connections',
  'rooms',
  'ended_games',
  'pending_statistics',
];
const columns = ['worker_id', 'sampled_at', ...latestColumns, ...peakColumns];

/** Raw and compacted rows expose the same aggregate-only read contract. */
export function workerMetricRows(sql: Sql) {
  return sql`(
    SELECT ${sql(columns)} FROM play.worker_metrics
    UNION ALL
    SELECT ${sql(columns)} FROM play.worker_metric_rollups
  )`;
}

/** Peak-of-peaks aggregation preserves spikes across successive retention tiers. */
export function aggregateWorkerMetrics(sql: Sql) {
  return sql`worker_id, max(sampled_at) AS sampled_at
    ${latestColumns.map(
      column => sql`,
      (array_agg(${sql(column)} ORDER BY sampled_at DESC))[1] AS ${sql(column)}`,
    )}
    ${peakColumns.map(column => sql`, max(${sql(column)}) AS ${sql(column)}`)}`;
}

async function compact(sql: Sql, bucketSeconds: 600 | 3600) {
  const source = bucketSeconds === 600 ? 'play.worker_metrics' : 'play.worker_metric_rollups';
  const days = bucketSeconds === 600 ? 7 : 30;
  const timestampColumn = bucketSeconds === 600 ? 'sampled_at' : 'bucket_start';
  await sql`WITH removed AS (
    DELETE FROM ${sql(source)}
    WHERE ${sql(timestampColumn)} < date_bin(
      ${bucketSeconds} * interval '1 second',
      statement_timestamp() - ${days} * interval '1 day',
      timestamptz 'epoch'
    )
    ${bucketSeconds === 3600 ? sql`AND bucket_seconds = 600` : sql``}
    RETURNING *
  )
  INSERT INTO play.worker_metric_rollups AS retained (
    bucket_start, bucket_seconds, ${sql(columns)}
  )
  SELECT date_bin(${bucketSeconds} * interval '1 second', sampled_at, timestamptz 'epoch'),
    ${bucketSeconds}, ${aggregateWorkerMetrics(sql)}
  FROM removed
  GROUP BY 1, worker_id
  ON CONFLICT (worker_id, bucket_seconds, bucket_start) DO UPDATE SET
    sampled_at = GREATEST(retained.sampled_at, excluded.sampled_at)
    ${latestColumns.map(
      column => sql`, ${sql(column)} =
      CASE WHEN excluded.sampled_at >= retained.sampled_at
      THEN ${sql(`excluded.${column}`)} ELSE ${sql(`retained.${column}`)} END`,
    )}
    ${peakColumns.map(
      column => sql`, ${sql(column)} =
      GREATEST(${sql(`retained.${column}`)}, ${sql(`excluded.${column}`)})`,
    )}`;
}

/** Move complete old buckets atomically. Interrupted maintenance rolls back,
 * concurrent workers skip the pass, and late samples merge without losing peaks. */
export async function compactWorkerMetrics(sql: Sql) {
  return sql.begin(async tx => {
    const [lock] = await tx<{ acquired: boolean }[]>`SELECT
      pg_try_advisory_xact_lock(hashtext('crossfire-worker-metrics-retention')) AS acquired`;
    if (!lock?.acquired) return false;
    await tx`SET LOCAL lock_timeout = '1s'`;
    await tx`SET LOCAL statement_timeout = '5s'`;
    await compact(tx, 600);
    await compact(tx, 3600);
    return true;
  });
}
