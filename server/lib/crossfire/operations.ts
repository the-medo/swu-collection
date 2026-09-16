import type { Sql } from 'postgres';
import { aggregateWorkerMetrics, workerMetricRows } from '../../../play/storage/worker-metrics.ts';
import type {
  CrossfireOperationsHours,
  CrossfireOperationsStatus,
  CrossfireWorkerMetric,
} from '../../../shared/types/crossfire-operations.ts';

type MetricRow = {
  worker_id: string;
  sampled_at: Date;
  started_at: Date;
  resource_source: CrossfireWorkerMetric['resourceSource'];
  memory_used_bytes: string;
  memory_limit_bytes: string | null;
  process_rss_bytes: string;
  heap_used_bytes: string;
  cpu_percent: number;
  cpu_limit_cores: number | null;
  event_loop_lag_ms: number;
  running_games: number;
  active_games: number;
  loaded_games: number;
  loading_games: number;
  attached_games: number;
  busy_games: number;
  queued_operations: number;
  game_capacity: number;
  connections: number;
  live_connections: number;
  replay_connections: number;
  rooms: number;
  ended_games: number;
  pending_statistics: number;
};
type LatestMetricRow = MetricRow & { online: boolean };
function view(row: MetricRow): CrossfireWorkerMetric {
  return {
    workerId: row.worker_id,
    sampledAt: row.sampled_at.toISOString(),
    startedAt: row.started_at.toISOString(),
    resourceSource: row.resource_source,
    memoryUsedBytes: Number(row.memory_used_bytes),
    memoryLimitBytes: row.memory_limit_bytes === null ? null : Number(row.memory_limit_bytes),
    processRssBytes: Number(row.process_rss_bytes),
    heapUsedBytes: Number(row.heap_used_bytes),
    cpuPercent: row.cpu_percent,
    cpuLimitCores: row.cpu_limit_cores,
    eventLoopLagMs: row.event_loop_lag_ms,
    runningGames: row.running_games,
    activeGames: row.active_games,
    loadedGames: row.loaded_games,
    loadingGames: row.loading_games,
    attachedGames: row.attached_games,
    busyGames: row.busy_games,
    queuedOperations: row.queued_operations,
    gameCapacity: row.game_capacity,
    connections: row.connections,
    liveConnections: row.live_connections,
    replayConnections: row.replay_connections,
    rooms: row.rooms,
    endedGames: row.ended_games,
    pendingStatistics: row.pending_statistics,
  };
}

const STALE_AFTER_MS = 45_000;
export class CrossfireOperations {
  constructor(private readonly sql: Sql) {}

  async status(hours: CrossfireOperationsHours): Promise<CrossfireOperationsStatus> {
    const metrics = workerMetricRows(this.sql);
    let bucketSeconds: number;
    if (hours === 'all') {
      const [oldest] = await this.sql<{ age_seconds: number | null }[]>`SELECT
        extract(epoch FROM (statement_timestamp() - min(sampled_at)))::double precision AS age_seconds
        FROM (
          (SELECT sampled_at FROM play.worker_metrics ORDER BY sampled_at LIMIT 1)
          UNION ALL
          (SELECT sampled_at FROM play.worker_metric_rollups ORDER BY sampled_at LIMIT 1)
        ) first_samples`;
      bucketSeconds = Math.max(3600, Math.ceil((oldest?.age_seconds ?? 0) / 720 / 3600) * 3600);
    } else {
      bucketSeconds = { 1: 15, 6: 30, 24: 120, 168: 900, 720: 3600, 8760: 43200 }[hours];
    }
    const [latest, history] = await Promise.all([
      this.sql<LatestMetricRow[]>`SELECT worker_metrics.*,
          sampled_at >= statement_timestamp() - ${STALE_AFTER_MS} * interval '1 millisecond' AS online
        FROM ${metrics} AS worker_metrics
        ORDER BY sampled_at DESC LIMIT 1`,
      this.sql<MetricRow[]>`SELECT ${aggregateWorkerMetrics(this.sql)}
        FROM (
          SELECT *, floor(extract(epoch FROM sampled_at) / ${bucketSeconds}) AS bucket
          FROM ${metrics} AS worker_metrics
          ${hours === 'all' ? this.sql`` : this.sql`WHERE sampled_at >= statement_timestamp() - ${hours} * interval '1 hour'`}
        ) samples GROUP BY bucket, worker_id ORDER BY bucket, max(sampled_at)`,
    ]);
    const latestView = latest[0] ? view(latest[0]) : null;
    return {
      online: latest[0]?.online ?? false,
      staleAfterSeconds: STALE_AFTER_MS / 1000,
      historyBucketSeconds: bucketSeconds,
      latest: latestView,
      history: history.map(view),
    };
  }
}
