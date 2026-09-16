import { expect, test } from 'bun:test';
import type { CrossfireWorkerMetric } from '../../../../../shared/types/crossfire-operations.ts';
import {
  buildCrossfireOperationsSeries,
  formatCrossfireOperationsTooltipTime,
} from './crossfireOperationsSeries.ts';

test('tooltip labels use the sample timestamp when the chart wrapper passes a series name', () => {
  const sampledAtMs = Date.parse('2026-09-16T12:00:00.000Z');
  const expected = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(sampledAtMs));
  for (const label of ['Memory (MiB)', 'Running'])
    expect(formatCrossfireOperationsTooltipTime(label, [{ payload: { sampledAtMs } }])).toBe(
      expected,
    );
  expect(formatCrossfireOperationsTooltipTime('Memory (MiB)', [])).toBe('');
});

const base: CrossfireWorkerMetric = {
  workerId: 'worker-a',
  sampledAt: '2026-09-16T12:00:00.000Z',
  startedAt: '2026-09-16T11:00:00.000Z',
  resourceSource: 'cgroup-v2',
  memoryUsedBytes: 128 * 1024 ** 2,
  memoryLimitBytes: 512 * 1024 ** 2,
  processRssBytes: 96 * 1024 ** 2,
  heapUsedBytes: 32 * 1024 ** 2,
  cpuPercent: 25,
  cpuLimitCores: 2,
  eventLoopLagMs: 1,
  runningGames: 3,
  activeGames: 2,
  loadedGames: 1,
  loadingGames: 0,
  attachedGames: 1,
  busyGames: 0,
  queuedOperations: 0,
  gameCapacity: 128,
  connections: 2,
  liveConnections: 2,
  replayConnections: 0,
  rooms: 1,
  endedGames: 0,
  pendingStatistics: 0,
};
const metric = (sampledAt: string, workerId = base.workerId): CrossfireWorkerMetric => ({
  ...base,
  workerId,
  sampledAt,
});

test('keeps two-minute history buckets connected in the 24-hour view', () => {
  const series = buildCrossfireOperationsSeries(
    [
      metric('2026-09-16T12:00:00.000Z'),
      metric('2026-09-16T12:02:00.000Z'),
      metric('2026-09-16T12:04:00.000Z'),
    ],
    45,
    120,
  );
  expect(series).toHaveLength(3);
  expect(series.every(point => point.cpuPercent !== null)).toBe(true);
  expect(series.every(point => !point.isolated)).toBe(true);
});

test('breaks chart lines when the worker changes', () => {
  const series = buildCrossfireOperationsSeries(
    [metric('2026-09-16T12:00:00.000Z'), metric('2026-09-16T12:00:15.000Z', 'worker-b')],
    45,
    15,
  );
  expect(series).toHaveLength(3);
  expect(series[1]?.cpuPercent).toBeNull();
  expect(series[0]?.isolated).toBe(true);
  expect(series[2]?.isolated).toBe(true);
});

test('breaks chart lines when samples are missing beyond the allowed gap', () => {
  const series = buildCrossfireOperationsSeries(
    [metric('2026-09-16T12:00:00.000Z'), metric('2026-09-16T12:01:00.000Z')],
    45,
    15,
  );
  expect(series).toHaveLength(3);
  expect(series[1]?.runningGames).toBeNull();
});
