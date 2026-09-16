import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Activity, Cpu, Database, MemoryStick, RefreshCw, UsersRound } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { useCrossfireOperations } from '@/api/crossfire-operations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type {
  CrossfireOperationsHours,
  CrossfireWorkerMetric,
} from '../../../../../shared/types/crossfire-operations.ts';
import {
  buildCrossfireOperationsSeries,
  formatCrossfireOperationsTooltipTime,
  type CrossfireOperationsChartPoint,
} from './crossfireOperationsSeries.ts';
import { CrossfireWorkerStatus } from './CrossfireWorkerStatus.tsx';

const resourceChart = {
  memoryMiB: { label: 'Memory (MiB)', color: 'hsl(var(--chart-2))' },
  cpuPercent: { label: 'CPU (%)', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;
const gameChart = {
  runningGames: { label: 'Running', color: 'hsl(var(--chart-1))' },
  activeGames: { label: 'Active (2m)', color: 'hsl(var(--chart-2))' },
  loadedGames: { label: 'Loaded', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;
const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}
function formatUptime(metric: CrossfireWorkerMetric) {
  const milliseconds = new Date(metric.sampledAt).getTime() - new Date(metric.startedAt).getTime();
  const hours = Math.max(0, Math.floor(milliseconds / 3_600_000)),
    minutes = Math.max(0, Math.floor((milliseconds % 3_600_000) / 60_000));
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}
function workerLabel(workerId: string) {
  return workerId.replace(/^worker-/, '').slice(0, 8);
}
function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
function axisTime(value: string | number) {
  return time.format(new Date(value));
}
function IsolatedDot({
  cx,
  cy,
  payload,
  stroke,
}: {
  cx: number;
  cy: number;
  payload: CrossfireOperationsChartPoint;
  stroke: string;
}) {
  return payload.isolated ? <circle cx={cx} cy={cy} r={2.5} fill={stroke} /> : <g />;
}

export function CrossfireOperationsPage() {
  const [hours, setHours] = useState<CrossfireOperationsHours>(6);
  const status = useCrossfireOperations(hours),
    latest = status.data?.latest;
  const history = useMemo(
    () =>
      buildCrossfireOperationsSeries(
        status.data?.history ?? [],
        status.data?.staleAfterSeconds ?? 45,
        status.data?.historyBucketSeconds ?? 15,
      ),
    [status.data?.history, status.data?.historyBucketSeconds, status.data?.staleAfterSeconds],
  );
  const memoryDetail = latest
    ? latest.memoryLimitBytes
      ? `${((latest.memoryUsedBytes / latest.memoryLimitBytes) * 100).toFixed(1)}% of ${formatBytes(latest.memoryLimitBytes)} limit`
      : `${latest.resourceSource === 'process' ? 'Process' : 'Container'} usage`
    : 'No sample available';
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">Crossfire operations</h2>
            <CrossfireWorkerStatus
              online={status.data?.online}
              unavailable={status.isError || status.fetchStatus === 'paused'}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Live worker resources, game lifecycle and in-memory pressure.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={status.isFetching}
          onClick={() => void status.refetch()}
        >
          <RefreshCw className={status.isFetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {status.isPending && <p role="status">Loading worker telemetry…</p>}
      {status.isError && (
        <p role="alert" className="text-sm text-destructive">
          {status.error.message}
        </p>
      )}
      {status.data && !latest && (
        <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
          No worker samples have been recorded yet. Start the Crossfire worker after applying the
          latest database migration.
        </div>
      )}
      {latest && status.data && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>
              Last sample{' '}
              {formatDistanceToNowStrict(new Date(latest.sampledAt), { addSuffix: true })}
            </span>
            <span>Worker uptime {formatUptime(latest)}</span>
            <span title={latest.workerId}>Worker {workerLabel(latest.workerId)}</span>
            <span>
              {latest.resourceSource === 'process'
                ? 'Host development process counters'
                : `${latest.resourceSource} container counters`}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Memory working set"
              value={formatBytes(latest.memoryUsedBytes)}
              detail={memoryDetail}
              icon={MemoryStick}
            />
            <MetricCard
              label="CPU"
              value={`${latest.cpuPercent.toFixed(1)}%`}
              detail={`${latest.cpuLimitCores ? `${latest.cpuLimitCores.toFixed(2)} CPU limit · ` : ''}1 core = 100%`}
              icon={Cpu}
            />
            <MetricCard
              label="Running games"
              value={latest.runningGames}
              detail={`${latest.endedGames} ended, awaiting archival`}
              icon={Database}
            />
            <MetricCard
              label="Active games"
              value={latest.activeGames}
              detail="Last accepted action within 2 minutes"
              icon={Activity}
            />
            <MetricCard
              label="Loaded games"
              value={latest.loadedGames}
              detail={`${latest.attachedGames} attached · ${latest.loadingGames} loading · ${latest.gameCapacity} capacity`}
              icon={MemoryStick}
            />
            <MetricCard
              label="Connections"
              value={latest.connections}
              detail={`${latest.liveConnections} live · ${latest.replayConnections} replay · ${latest.rooms} rooms`}
              icon={UsersRound}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">History</h3>
            <div className="flex rounded-md border p-0.5" aria-label="History range">
              {([1, 6, 24] as const).map(value => (
                <Button
                  key={value}
                  size="sm"
                  variant={hours === value ? 'secondary' : 'ghost'}
                  className="h-7 px-2.5"
                  aria-pressed={hours === value}
                  onClick={() => setHours(value)}
                >
                  {value}h
                </Button>
              ))}
            </div>
          </div>

          {history.length < 2 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              More samples are needed before charts can be drawn.
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Worker resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={resourceChart}
                    className="h-64 w-full"
                    role="img"
                    aria-label="Crossfire worker memory and CPU over time"
                  >
                    <LineChart data={history} margin={{ left: 4, right: 4 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="sampledAtMs"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={axisTime}
                        minTickGap={28}
                      />
                      <YAxis yAxisId="memory" width={42} tickFormatter={value => `${value}`} />
                      <YAxis
                        yAxisId="cpu"
                        orientation="right"
                        width={38}
                        tickFormatter={value => `${value}%`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={formatCrossfireOperationsTooltipTime}
                            formatter={(value, name) => (
                              <div className="flex w-full justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {resourceChart[name as keyof typeof resourceChart]?.label}
                                </span>
                                <span className="font-mono tabular-nums">
                                  {Number(value).toFixed(1)}
                                  {name === 'cpuPercent' ? '%' : ' MiB'}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line
                        yAxisId="memory"
                        dataKey="memoryMiB"
                        stroke="var(--color-memoryMiB)"
                        dot={IsolatedDot}
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="cpu"
                        dataKey="cpuPercent"
                        stroke="var(--color-cpuPercent)"
                        dot={IsolatedDot}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={gameChart}
                    className="h-64 w-full"
                    role="img"
                    aria-label="Crossfire running, active and loaded games over time"
                  >
                    <LineChart data={history} margin={{ left: 4, right: 4 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="sampledAtMs"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={axisTime}
                        minTickGap={28}
                      />
                      <YAxis width={34} allowDecimals={false} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={formatCrossfireOperationsTooltipTime}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line
                        dataKey="runningGames"
                        stroke="var(--color-runningGames)"
                        dot={IsolatedDot}
                        isAnimationActive={false}
                      />
                      <Line
                        dataKey="activeGames"
                        stroke="var(--color-activeGames)"
                        dot={IsolatedDot}
                        isAnimationActive={false}
                      />
                      <Line
                        dataKey="loadedGames"
                        stroke="var(--color-loadedGames)"
                        dot={IsolatedDot}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Process RSS / heap</p>
              <p className="mt-1 font-medium tabular-nums">
                {formatBytes(latest.processRssBytes)} / {formatBytes(latest.heapUsedBytes)}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Event-loop lag</p>
              <p className="mt-1 font-medium tabular-nums">{latest.eventLoopLagMs.toFixed(1)} ms</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Worker pressure</p>
              <p className="mt-1 font-medium tabular-nums">
                {latest.busyGames} busy · {latest.queuedOperations} queued
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Statistics backlog</p>
              <p className="mt-1 font-medium tabular-nums">{latest.pendingStatistics} games</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
