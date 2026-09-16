import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { Sql } from 'postgres';
import type { GameWorker } from './games.ts';

export type ResourceSource = 'cgroup-v2' | 'cgroup-v1' | 'process';
export type RuntimeCounters = {
  source: ResourceSource;
  memoryUsedBytes: number;
  memoryLimitBytes: number | null;
  processRssBytes: number;
  heapUsedBytes: number;
  cpuUsageMicros: number;
  cpuLimitCores: number | null;
};
type ReadText = (path: string) => Promise<string>;
type ProcessMemory = Pick<ReturnType<typeof process.memoryUsage>, 'rss' | 'heapUsed'>;

const asNonnegative = (value: string) => {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};
const memoryLimit = (value: string | undefined) => {
  if (!value || value.trim() === 'max') return null;
  const parsed = asNonnegative(value);
  // cgroup v1 commonly represents "unlimited" with a value close to 2^63.
  return parsed !== undefined && parsed > 0 && parsed < 2 ** 60 ? parsed : null;
};
const cpuLimit = (value: string | undefined) => {
  if (!value) return null;
  const [quota, period] = value.trim().split(/\s+/);
  if (!quota || quota === 'max' || !period) return null;
  const quotaNumber = Number(quota),
    periodNumber = Number(period);
  return quotaNumber > 0 && periodNumber > 0 ? quotaNumber / periodNumber : null;
};
const cpuStatUsage = (value: string | undefined) => {
  const match = value?.match(/^usage_usec\s+(\d+)$/m);
  return match ? Number(match[1]) : undefined;
};
const memoryStatValue = (value: string | undefined, field: string) => {
  const match = value?.match(new RegExp(`^${field}\\s+(\\d+)$`, 'm'));
  return match ? Number(match[1]) : 0;
};
const defaultReadText: ReadText = path => readFile(path, 'utf8');
async function optional(readText: ReadText, path: string) {
  try {
    return await readText(path);
  } catch {
    return undefined;
  }
}
function isContainerized() {
  return existsSync('/.dockerenv') || process.env.CONTAINER === 'true';
}

/** Read the worker's own container counters when available. Host development
 * deliberately falls back to process values instead of reporting the host's
 * broader user cgroup as if it belonged to Crossfire. */
export async function readRuntimeCounters(
  options: {
    containerized?: boolean;
    readText?: ReadText;
    processMemory?: () => ProcessMemory;
    processCpu?: () => NodeJS.CpuUsage;
  } = {},
): Promise<RuntimeCounters> {
  const readText = options.readText ?? defaultReadText,
    processMemory = (options.processMemory ?? process.memoryUsage)(),
    processCpu = (options.processCpu ?? process.cpuUsage)(),
    processCpuMicros = processCpu.user + processCpu.system;
  if (options.containerized ?? isContainerized()) {
    const [usedV2, limitV2, memoryStatV2, cpuV2, cpuMaxV2] = await Promise.all([
      optional(readText, '/sys/fs/cgroup/memory.current'),
      optional(readText, '/sys/fs/cgroup/memory.max'),
      optional(readText, '/sys/fs/cgroup/memory.stat'),
      optional(readText, '/sys/fs/cgroup/cpu.stat'),
      optional(readText, '/sys/fs/cgroup/cpu.max'),
    ]);
    const memoryV2 = usedV2 === undefined ? undefined : asNonnegative(usedV2),
      cpuUsageV2 = cpuStatUsage(cpuV2);
    if (memoryV2 !== undefined && cpuUsageV2 !== undefined)
      return {
        source: 'cgroup-v2',
        memoryUsedBytes: Math.max(0, memoryV2 - memoryStatValue(memoryStatV2, 'inactive_file')),
        memoryLimitBytes: memoryLimit(limitV2),
        processRssBytes: processMemory.rss,
        heapUsedBytes: processMemory.heapUsed,
        cpuUsageMicros: cpuUsageV2,
        cpuLimitCores: cpuLimit(cpuMaxV2),
      };

    const [usedV1, limitV1, memoryStatV1, cpuV1, quotaV1, periodV1] = await Promise.all([
      optional(readText, '/sys/fs/cgroup/memory/memory.usage_in_bytes'),
      optional(readText, '/sys/fs/cgroup/memory/memory.limit_in_bytes'),
      optional(readText, '/sys/fs/cgroup/memory/memory.stat'),
      optional(readText, '/sys/fs/cgroup/cpuacct/cpuacct.usage'),
      optional(readText, '/sys/fs/cgroup/cpu/cpu.cfs_quota_us'),
      optional(readText, '/sys/fs/cgroup/cpu/cpu.cfs_period_us'),
    ]);
    const memoryV1 = usedV1 === undefined ? undefined : asNonnegative(usedV1),
      cpuNanosecondsV1 = cpuV1 === undefined ? undefined : asNonnegative(cpuV1),
      quota = quotaV1 === undefined ? undefined : Number(quotaV1.trim()),
      period = periodV1 === undefined ? undefined : Number(periodV1.trim());
    if (memoryV1 !== undefined && cpuNanosecondsV1 !== undefined)
      return {
        source: 'cgroup-v1',
        memoryUsedBytes: Math.max(
          0,
          memoryV1 - memoryStatValue(memoryStatV1, 'total_inactive_file'),
        ),
        memoryLimitBytes: memoryLimit(limitV1),
        processRssBytes: processMemory.rss,
        heapUsedBytes: processMemory.heapUsed,
        cpuUsageMicros: cpuNanosecondsV1 / 1000,
        cpuLimitCores:
          quota !== undefined && quota > 0 && period !== undefined && period > 0
            ? quota / period
            : null,
      };
  }
  return {
    source: 'process',
    memoryUsedBytes: processMemory.rss,
    memoryLimitBytes: null,
    processRssBytes: processMemory.rss,
    heapUsedBytes: processMemory.heapUsed,
    cpuUsageMicros: processCpuMicros,
    cpuLimitCores: null,
  };
}

export function cpuPercent(
  previous: { usageMicros: number; observedAtMs: number } | undefined,
  current: { usageMicros: number; observedAtMs: number },
) {
  if (!previous) return 0;
  const elapsedMicros = (current.observedAtMs - previous.observedAtMs) * 1000,
    usedMicros = current.usageMicros - previous.usageMicros;
  if (elapsedMicros <= 0 || usedMicros < 0) return 0;
  // Match common container tooling: one fully occupied CPU is 100%, so a
  // multi-core container can exceed 100%.
  return Math.max(0, (usedMicros / elapsedMicros) * 100);
}

type ServerStatistics = {
  connections: number;
  liveConnections: number;
  replayConnections: number;
  rooms: number;
};
type MetricsOptions = {
  intervalMs?: number;
  retentionMs?: number;
  databaseTime?: boolean;
  now?: () => Date;
  monotonicNow?: () => number;
  resources?: () => Promise<RuntimeCounters>;
  onFault?: (error: unknown) => void;
};
type GameCounts = {
  running_games: number;
  active_games: number;
  ended_games: number;
  pending_statistics: number;
};

/** Aggregate, private worker telemetry. Samples contain no game IDs, users,
 * commands, card data or other authoritative state. */
export class WorkerMetrics {
  readonly #startedAt: Date;
  readonly #intervalMs: number;
  readonly #retentionMs: number;
  readonly #databaseTime: boolean;
  readonly #now: () => Date;
  readonly #monotonicNow: () => number;
  readonly #resources: () => Promise<RuntimeCounters>;
  readonly #onFault: (error: unknown) => void;
  #lastCpu?: { source: ResourceSource; usageMicros: number; observedAtMs: number };
  #nextPruneAt = 0;
  #pendingEventLoopLagMs = 0;
  #sampling?: Promise<void>;
  #timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly sql: Sql,
    private readonly worker: GameWorker,
    private readonly serverStatistics: () => ServerStatistics,
    options: MetricsOptions = {},
  ) {
    this.#intervalMs = options.intervalMs ?? 15_000;
    this.#retentionMs = options.retentionMs ?? 7 * 24 * 60 * 60 * 1000;
    this.#databaseTime = options.databaseTime ?? true;
    this.#now = options.now ?? (() => new Date());
    this.#monotonicNow = options.monotonicNow ?? performance.now.bind(performance);
    this.#resources = options.resources ?? readRuntimeCounters;
    this.#onFault =
      options.onFault ?? (error => console.error('Crossfire metrics sampling failed', error));
    this.#startedAt = this.#now();
  }

  start() {
    if (this.#timer) return;
    let expectedAt = this.#monotonicNow() + this.#intervalMs;
    void this.sample().catch(this.#onFault);
    this.#timer = setInterval(() => {
      const now = this.#monotonicNow(),
        lag = Math.max(0, now - expectedAt);
      expectedAt = now + this.#intervalMs;
      void this.sample(lag).catch(this.#onFault);
    }, this.#intervalMs);
    this.#timer.unref?.();
  }

  sample(eventLoopLagMs = 0): Promise<void> {
    this.#pendingEventLoopLagMs = Math.max(this.#pendingEventLoopLagMs, eventLoopLagMs);
    if (this.#sampling) return this.#sampling;
    const pendingEventLoopLagMs = this.#pendingEventLoopLagMs;
    this.#pendingEventLoopLagMs = 0;
    this.#sampling = this.#sample(pendingEventLoopLagMs).finally(() => {
      this.#sampling = undefined;
    });
    return this.#sampling;
  }

  async #sample(eventLoopLagMs: number) {
    const sampledAt = this.#now(),
      observedAtMs = this.#monotonicNow(),
      resources = await this.#resources(),
      currentCpu = {
        source: resources.source,
        usageMicros: resources.cpuUsageMicros,
        observedAtMs,
      },
      cpu = cpuPercent(
        this.#lastCpu?.source === currentCpu.source ? this.#lastCpu : undefined,
        currentCpu,
      );
    this.#lastCpu = currentCpu;
    const [counts] = await this.sql<GameCounts[]>`SELECT
      (SELECT count(*)::int FROM play.games WHERE status = 'running') AS running_games,
      (SELECT count(*)::int FROM play.games WHERE status = 'running' AND sequence > 0
        AND updated_at >= statement_timestamp() - interval '2 minutes') AS active_games,
      (SELECT count(*)::int FROM play.games WHERE status = 'ended') AS ended_games,
      (SELECT count(*)::int FROM play.games
        WHERE status = 'finalized' AND statistics_at IS NULL) AS pending_statistics`;
    const games = this.worker.statistics,
      server = this.serverStatistics();
    await this.sql`INSERT INTO play.worker_metrics (
      worker_id, sampled_at, started_at, resource_source,
      memory_used_bytes, memory_limit_bytes, process_rss_bytes, heap_used_bytes,
      cpu_percent, cpu_limit_cores, event_loop_lag_ms,
      running_games, active_games, loaded_games, loading_games, attached_games,
      busy_games, queued_operations, game_capacity, connections, live_connections,
      replay_connections, rooms, ended_games, pending_statistics
    ) VALUES (
      ${this.worker.ownerId}, COALESCE(${this.#databaseTime ? null : sampledAt}::timestamptz, clock_timestamp()),
      ${this.#startedAt}, ${resources.source},
      ${resources.memoryUsedBytes}, ${resources.memoryLimitBytes}, ${resources.processRssBytes},
      ${resources.heapUsedBytes}, ${cpu}, ${resources.cpuLimitCores}, ${eventLoopLagMs},
      ${counts?.running_games ?? 0}, ${counts?.active_games ?? 0}, ${games.loadedGames},
      ${games.loadingGames}, ${games.attachedGames}, ${games.busyGames},
      ${games.queuedOperations}, ${games.capacity}, ${server.connections},
      ${server.liveConnections}, ${server.replayConnections}, ${server.rooms},
      ${counts?.ended_games ?? 0}, ${counts?.pending_statistics ?? 0}
    )`;
    if (sampledAt.getTime() >= this.#nextPruneAt) {
      this.#nextPruneAt = sampledAt.getTime() + 60 * 60 * 1000;
      await this.sql`DELETE FROM play.worker_metrics
        WHERE sampled_at < statement_timestamp() - ${this.#retentionMs} * interval '1 millisecond'`;
    }
  }

  async stop() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = undefined;
    await this.#sampling?.catch(() => {});
  }
}
