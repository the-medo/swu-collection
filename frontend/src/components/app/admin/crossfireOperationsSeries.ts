import type { CrossfireWorkerMetric } from '../../../../../shared/types/crossfire-operations.ts';

const tooltipTime = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatCrossfireOperationsTooltipTime(
  _label: unknown,
  payload: ReadonlyArray<{ payload?: { sampledAtMs?: number } }>,
) {
  const sampledAtMs = payload[0]?.payload?.sampledAtMs;
  return typeof sampledAtMs === 'number' && Number.isFinite(sampledAtMs)
    ? tooltipTime.format(new Date(sampledAtMs))
    : '';
}

export type CrossfireOperationsChartPoint = {
  sampledAtMs: number;
  memoryMiB: number | null;
  cpuPercent: number | null;
  runningGames: number | null;
  activeGames: number | null;
  loadedGames: number | null;
  isolated: boolean;
};

const gap = (sampledAtMs: number): CrossfireOperationsChartPoint => ({
  sampledAtMs,
  memoryMiB: null,
  cpuPercent: null,
  runningGames: null,
  activeGames: null,
  loadedGames: null,
  isolated: false,
});

export function buildCrossfireOperationsSeries(
  history: CrossfireWorkerMetric[],
  staleAfterSeconds: number,
  historyBucketSeconds: number,
) {
  const result: CrossfireOperationsChartPoint[] = [],
    gapAfterMs = Math.max(staleAfterSeconds * 1000, historyBucketSeconds * 1500);
  let previous: CrossfireWorkerMetric | undefined;
  for (const point of history) {
    const sampledAtMs = new Date(point.sampledAt).getTime(),
      previousSampledAtMs = previous ? new Date(previous.sampledAt).getTime() : undefined;
    if (
      previous &&
      previousSampledAtMs !== undefined &&
      (previous.workerId !== point.workerId || sampledAtMs - previousSampledAtMs > gapAfterMs)
    )
      result.push(gap((sampledAtMs + previousSampledAtMs) / 2));
    result.push({
      sampledAtMs,
      memoryMiB: point.memoryUsedBytes / 1024 ** 2,
      cpuPercent: point.cpuPercent,
      runningGames: point.runningGames,
      activeGames: point.activeGames,
      loadedGames: point.loadedGames,
      isolated: false,
    });
    previous = point;
  }
  for (const [index, point] of result.entries())
    point.isolated =
      point.cpuPercent !== null &&
      result[index - 1]?.cpuPercent == null &&
      result[index + 1]?.cpuPercent == null;
  return result;
}
