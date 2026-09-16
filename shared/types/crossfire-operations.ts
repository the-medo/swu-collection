import { z } from 'zod';

export const crossfireOperationsQuery = z.strictObject({
  hours: z.enum(['1', '6', '24']).default('6'),
});
export type CrossfireOperationsHours = 1 | 6 | 24;
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
