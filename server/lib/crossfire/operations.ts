import type { Sql } from 'postgres';
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
    const bucketSeconds = hours === 1 ? 15 : hours === 6 ? 30 : 120;
    const [latest, history] = await Promise.all([
      this.sql<LatestMetricRow[]>`SELECT worker_metrics.*,
          sampled_at >= statement_timestamp() - ${STALE_AFTER_MS} * interval '1 millisecond' AS online
        FROM play.worker_metrics AS worker_metrics
        ORDER BY sampled_at DESC LIMIT 1`,
      this.sql<MetricRow[]>`SELECT
          worker_id,
          max(sampled_at) AS sampled_at,
          (array_agg(started_at ORDER BY sampled_at DESC))[1] AS started_at,
          (array_agg(resource_source ORDER BY sampled_at DESC))[1] AS resource_source,
          max(memory_used_bytes) AS memory_used_bytes,
          (array_agg(memory_limit_bytes ORDER BY sampled_at DESC))[1] AS memory_limit_bytes,
          max(process_rss_bytes) AS process_rss_bytes,
          max(heap_used_bytes) AS heap_used_bytes,
          max(cpu_percent) AS cpu_percent,
          (array_agg(cpu_limit_cores ORDER BY sampled_at DESC))[1] AS cpu_limit_cores,
          max(event_loop_lag_ms) AS event_loop_lag_ms,
          max(running_games) AS running_games,
          max(active_games) AS active_games,
          max(loaded_games) AS loaded_games,
          max(loading_games) AS loading_games,
          max(attached_games) AS attached_games,
          max(busy_games) AS busy_games,
          max(queued_operations) AS queued_operations,
          (array_agg(game_capacity ORDER BY sampled_at DESC))[1] AS game_capacity,
          max(connections) AS connections,
          max(live_connections) AS live_connections,
          max(replay_connections) AS replay_connections,
          max(rooms) AS rooms,
          max(ended_games) AS ended_games,
          max(pending_statistics) AS pending_statistics
        FROM (
          SELECT *, floor(extract(epoch FROM sampled_at) / ${bucketSeconds}) AS bucket
          FROM play.worker_metrics
          WHERE sampled_at >= statement_timestamp() - ${hours} * interval '1 hour'
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
