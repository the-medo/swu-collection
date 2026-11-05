import { memo, useCallback, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { Store, useStore } from '@tanstack/react-store';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Customized,
  ReferenceLine,
  XAxis,
  YAxis,
  usePlotArea,
  useActiveTooltipLabel,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { aprMetrics, type AprMetric } from './tournamentMetaApr.ts';
import {
  chartConfig,
  APR_BATCH_SIZE,
  APR_HEADER_HEIGHT,
  APR_LABEL_WIDTH,
  APR_PLOT_TOP,
  APR_PLOT_BOTTOM,
  type AprPlotProps,
  type AprChartItem,
  type AprInteractionStore,
} from './tournamentMetaAprPresentation.ts';
import { AprChartTooltip, AprKeyboardTooltip } from './TournamentMetaAprTooltip.tsx';
import TournamentMetaAprRowLabel from './TournamentMetaAprRowLabel.tsx';
import TournamentMetaAprFrame, { AprValuesRows } from './TournamentMetaAprFrame.tsx';

function RechartsValues({
  data,
  metrics,
  portal,
  offset,
  startIndex,
  interaction,
}: {
  data: AprChartItem[];
  metrics: AprMetric[];
  portal: HTMLDivElement | null;
  offset: number;
  startIndex: number;
  interaction: AprInteractionStore;
}) {
  const area = usePlotArea();
  const pointerKey = useActiveTooltipLabel();
  const hidden = useStore(interaction, state => state.hidden);
  const keyboardIndex = useStore(interaction, state => state.keyboardIndex);
  if (!area || !data.length) return null;
  const height = area.height / data.length;
  const activeKey = hidden
    ? undefined
    : keyboardIndex === null
      ? pointerKey
      : data[keyboardIndex - startIndex]?.key;
  return (
    <AprValuesRows
      rows={data.map((item, index) => ({
        item,
        y: offset + area.y + (index + 0.5) * height,
        height,
        index: startIndex + index,
      }))}
      metrics={metrics}
      portal={portal}
      activeKey={activeKey}
    />
  );
}

function KeyboardHighlight({
  interaction,
  startIndex,
  rowCount,
}: {
  interaction: AprInteractionStore;
  startIndex: number;
  rowCount: number;
}) {
  const area = usePlotArea();
  const index = useStore(interaction, state => (state.hidden ? null : state.keyboardIndex));
  if (!area || index === null || index < startIndex || index >= startIndex + rowCount) return null;
  const height = area.height / rowCount;
  return (
    <rect
      x={area.x}
      y={area.y + (index - startIndex) * height}
      width={area.width}
      height={height}
      fill="hsl(var(--muted))"
      fillOpacity={0.6}
    />
  );
}

interface WindowProps extends AprPlotProps {
  rowHeight: number;
  startIndex: number;
  isLastWindow: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  labelPortal: HTMLDivElement | null;
  valuesPortal: HTMLDivElement | null;
  tooltipPortal: HTMLDivElement | null;
  interaction: AprInteractionStore;
}

// Scroll/hover updates outside this window leave the bars and artwork alone.
const AprPlotWindow = memo(function AprPlotWindow({
  data,
  analysis,
  axisExtent,
  metaInfo,
  rowHeight,
  startIndex,
  isLastWindow,
  viewportRef,
  labelPortal,
  valuesPortal,
  tooltipPortal,
  interaction,
}: WindowProps) {
  const items = useMemo(() => new Map(data.map(item => [item.key, item])), [data]);
  const offset = startIndex * rowHeight;
  const height = data.length * rowHeight + APR_PLOT_TOP + APR_PLOT_BOTTOM;
  return (
    <div
      className="absolute inset-x-0"
      style={{ top: offset }}
      onMouseLeave={() => interaction.setState(state => ({ ...state, hidden: true, bar: null }))}
    >
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <BarChart
          accessibilityLayer={false}
          layout="vertical"
          data={data}
          barGap={3}
          margin={{ top: APR_PLOT_TOP, right: 16, bottom: 8, left: 0 }}
          onMouseMove={() =>
            interaction.setState(state =>
              state.hidden || state.keyboardIndex !== null
                ? { ...state, hidden: false, keyboardIndex: null }
                : state,
            )
          }
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickFormatter={value => `${value}%`}
            domain={[-axisExtent, axisExtent]}
            ticks={[-axisExtent, -axisExtent / 2, 0, axisExtent / 2, axisExtent]}
            tick={isLastWindow ? { fontSize: 10 } : false}
            tickLine={isLastWindow}
            axisLine={isLastWindow}
          />
          <YAxis
            type="category"
            dataKey="key"
            width={APR_LABEL_WIDTH}
            interval={0}
            tickLine={false}
            tickSize={0}
            tickMargin={0}
            tick={({ x, y, payload }) => {
              const item = items.get(String(payload.value));
              return item ? (
                <TournamentMetaAprRowLabel
                  key={item.key}
                  x={Number(x)}
                  y={Number(y) + offset}
                  item={item}
                  metaInfo={metaInfo}
                  compact={analysis.metrics.length < 4}
                  portal={labelPortal}
                />
              ) : (
                <g />
              );
            }}
          />
          <Customized
            component={
              <KeyboardHighlight
                interaction={interaction}
                startIndex={startIndex}
                rowCount={data.length}
              />
            }
          />
          <ReferenceLine x={0} stroke="hsl(var(--foreground))" strokeWidth={1.5} />
          <AprChartTooltip
            interaction={interaction}
            analysis={analysis}
            viewportRef={viewportRef}
            portal={tooltipPortal}
            offset={offset}
          />
          {analysis.metrics.map(metric => (
            <Bar
              key={metric}
              dataKey={`values.${metric}`}
              name={aprMetrics[metric].label}
              fill={`var(--color-${metric})`}
              barSize={12}
              isAnimationActive={false}
              onMouseEnter={bar =>
                interaction.setState(state =>
                  state.bar !== null &&
                  state.bar.key === bar.payload.key &&
                  state.bar.metric === metric
                    ? state
                    : { ...state, bar: { key: bar.payload.key, metric } },
                )
              }
              onMouseLeave={() =>
                interaction.setState(state => (state.bar ? { ...state, bar: null } : state))
              }
            />
          ))}
          <Customized
            component={
              <RechartsValues
                data={data}
                metrics={analysis.metrics}
                portal={valuesPortal}
                offset={offset}
                startIndex={startIndex}
                interaction={interaction}
              />
            }
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
});

export default function TournamentMetaAprRechartsPlot(props: AprPlotProps) {
  const { data, analysis } = props;
  const { itemsToShow, hasMore, isLoading, observerTarget, loadMore } = useInfiniteScroll({
    totalItems: data.length,
    initialItemsToLoad: APR_BATCH_SIZE,
    itemsPerBatch: APR_BATCH_SIZE,
    threshold: 0,
  });
  const loadedCount = Math.min(itemsToShow, data.length);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [tooltipPortal, setTooltipPortal] = useState<HTMLDivElement | null>(null);
  const [labelPortal, setLabelPortal] = useState<HTMLDivElement | null>(null);
  const [valuesPortal, setValuesPortal] = useState<HTMLDivElement | null>(null);
  const [interaction] = useState<AprInteractionStore>(
    () => new Store<AprInteractionStore['state']>({ bar: null, hidden: true, keyboardIndex: null }),
  );
  const helpId = useId();
  const rowHeight = Math.max(
    analysis.metrics.length * 16 + 24,
    (260 - APR_PLOT_TOP - APR_PLOT_BOTTOM) / Math.min(data.length, APR_BATCH_SIZE),
  );
  const getItemKey = useCallback((index: number) => data[index].key, [data]);
  const virtualizer = useVirtualizer({
    count: loadedCount,
    getScrollElement: () => viewportRef.current,
    getItemKey,
    estimateSize: () => rowHeight,
    overscan: 2,
    paddingStart: APR_HEADER_HEIGHT + APR_PLOT_TOP,
    paddingEnd: APR_PLOT_BOTTOM,
    scrollPaddingStart: APR_HEADER_HEIGHT,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const startIndex = virtualRows[0]?.index ?? 0;
  const endIndex = virtualRows[virtualRows.length - 1]?.index ?? -1;
  const windowData = useMemo(
    () => data.slice(startIndex, endIndex + 1),
    [data, startIndex, endIndex],
  );
  const height = loadedCount * rowHeight + APR_PLOT_TOP + APR_PLOT_BOTTOM;
  return (
    <div className="relative" data-apr-loaded={loadedCount}>
      <p id={helpId} className="sr-only">
        Use Up and Down arrow keys to inspect rows. Scroll or use Show more to load additional rows.
      </p>
      <TournamentMetaAprFrame
        viewportRef={viewportRef}
        labelPortalRef={setLabelPortal}
        valuesPortalRef={setValuesPortal}
        height={height}
        metrics={analysis.metrics}
        sortMetric={props.sortMetric}
        rowCount={data.length}
        describedBy={helpId}
        onScroll={() =>
          interaction.setState(state =>
            state.hidden || state.keyboardIndex !== null
              ? state
              : { ...state, hidden: true, bar: null },
          )
        }
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Escape') {
            interaction.setState(state => ({ ...state, hidden: true, keyboardIndex: null }));
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const previous = interaction.state.keyboardIndex;
            // Start below the sticky header, excluding rows rendered only for overscan.
            const firstVisible = Math.ceil(
              ((viewportRef.current?.scrollTop ?? 0) - APR_PLOT_TOP) / rowHeight,
            );
            const index = Math.max(
              0,
              Math.min(
                loadedCount - 1,
                previous === null ? firstVisible : previous + (event.key === 'ArrowDown' ? 1 : -1),
              ),
            );
            interaction.setState({ bar: null, hidden: false, keyboardIndex: index });
            virtualizer.scrollToIndex(index, { align: 'auto' });
          }
        }}
        footer={
          data.length > APR_BATCH_SIZE && (
            <div
              ref={observerTarget}
              className="sticky left-0 flex h-12 items-center justify-center gap-3 px-2 text-xs text-muted-foreground"
            >
              <span>
                {loadedCount} of {data.length} groups shown
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-xs aria-disabled:cursor-default aria-disabled:opacity-50"
                onClick={loadMore}
                aria-disabled={isLoading || !hasMore}
                aria-label="Show more APR rows"
              >
                {isLoading ? 'Loading…' : 'Show more'}
              </Button>
            </div>
          )
        }
      >
        {windowData.length > 0 && (
          <AprPlotWindow
            {...props}
            data={windowData}
            rowHeight={rowHeight}
            startIndex={startIndex}
            isLastWindow={endIndex === loadedCount - 1}
            viewportRef={viewportRef}
            labelPortal={labelPortal}
            valuesPortal={valuesPortal}
            tooltipPortal={tooltipPortal}
            interaction={interaction}
          />
        )}
      </TournamentMetaAprFrame>
      <div ref={setTooltipPortal} className="pointer-events-none absolute inset-0 z-10" />
      <AprKeyboardTooltip
        data={data}
        analysis={analysis}
        interaction={interaction}
        viewportRef={viewportRef}
        rowHeight={rowHeight}
      />
    </div>
  );
}
