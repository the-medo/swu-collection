import { z } from 'zod';

export const crossfireOperationsQuery = z.strictObject({
  hours: z.enum(['1', '6', '24', '168', '720', '8760', 'all']).default('6'),
});
export type CrossfireOperationsHours = 1 | 6 | 24 | 168 | 720 | 8760 | 'all';
export const crossfireOperationsRanges = [
  { hours: 1, label: '1h' },
  { hours: 6, label: '6h' },
  { hours: 24, label: '24h' },
  { hours: 168, label: '7d' },
  { hours: 720, label: '30d' },
  { hours: 8760, label: '1y' },
  { hours: 'all', label: 'All' },
] as const;
export type CrossfireWorkerMetric = {
  workerId: string;
  sampledAt: string;
  startedAt: string;
  resourceSource: 'cgroup-v2' | 'cgroup-v1' | 'process';
  memoryUsedBytes: number;
  memoryLimitBytes: number | null;
  processRssBytes: number;
  heapUsedBytes: number;
  cpuPercent: number;
  cpuLimitCores: number | null;
  eventLoopLagMs: number;
  runningGames: number;
  activeGames: number;
  loadedGames: number;
  loadingGames: number;
  attachedGames: number;
  busyGames: number;
  queuedOperations: number;
  gameCapacity: number;
  connections: number;
  liveConnections: number;
  replayConnections: number;
  rooms: number;
  endedGames: number;
  pendingStatistics: number;
};
export type CrossfireOperationsStatus = {
  online: boolean;
  staleAfterSeconds: number;
  historyBucketSeconds: number;
  latest: CrossfireWorkerMetric | null;
  history: CrossfireWorkerMetric[];
};
