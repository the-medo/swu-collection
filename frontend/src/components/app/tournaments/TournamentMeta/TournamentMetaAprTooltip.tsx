import { memo, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useStore } from '@tanstack/react-store';
import { ChartTooltip } from '@/components/ui/chart.tsx';
import { aprMetrics, type AprMetric } from './tournamentMetaApr.ts';
import {
  chartConfig,
  APR_HEADER_HEIGHT,
  APR_LABEL_WIDTH,
  APR_PLOT_TOP,
  APR_VALUE_COLUMN_WIDTH,
  type AprInteractionStore,
  formatRate,
  type AprChartItem,
  type AprAnalysis,
} from './tournamentMetaAprPresentation.ts';

// Chart coordinates can extend far below the scroll viewport. Keep the shared tooltip inside the visible part of the chart.
export function AprTooltipContainer({
  viewportRef,
  coordinate,
  children,
  valuesWidth,
  anchorXToViewport = false,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  coordinate: { x?: number; y?: number };
  children: ReactNode;
  valuesWidth: number;
  anchorXToViewport?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, visible: false });
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const tooltip = ref.current;
    if (!viewport || !tooltip) return;
    const place = () => {
      const x = (coordinate.x ?? 0) - (anchorXToViewport ? 0 : viewport.scrollLeft);
      const y = (coordinate.y ?? 0) - viewport.scrollTop;
      const right = x + 10;
      const left = x - tooltip.offsetWidth - 10;
      const plotRight = viewport.scrollWidth - valuesWidth - viewport.scrollLeft;
      const next = {
        x: Math.max(
          8,
          Math.min(
            right + tooltip.offsetWidth <= Math.min(viewport.clientWidth, plotRight) - 8
              ? right
              : left,
            viewport.clientWidth - tooltip.offsetWidth - 8,
          ),
        ),
        y: Math.max(8, Math.min(y + 10, viewport.clientHeight - tooltip.offsetHeight - 8)),
        visible:
          y >= APR_HEADER_HEIGHT &&
          y <= viewport.clientHeight &&
          x >= APR_LABEL_WIDTH &&
          x <= viewport.clientWidth,
      };
      setPosition(previous =>
        previous.x === next.x && previous.y === next.y && previous.visible === next.visible
          ? previous
          : next,
      );
    };
    place();
    viewport.addEventListener('scroll', place, { passive: true });
    const observer = new ResizeObserver(place);
    observer.observe(viewport);
    observer.observe(tooltip);
    return () => {
      viewport.removeEventListener('scroll', place);
      observer.disconnect();
    };
  }, [viewportRef, coordinate.x, coordinate.y, valuesWidth, anchorXToViewport]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 w-72 max-w-[calc(100%-16px)] rounded-lg border bg-popover p-2 text-xs text-popover-foreground shadow-xl"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        visibility: position.visible ? undefined : 'hidden',
      }}
    >
      {children}
    </div>
  );
}

export function AprTooltipContent({
  item,
  analysis,
  hoveredBar,
}: {
  item: AprChartItem;
  analysis: AprAnalysis;
  hoveredBar: { key: string; metric: AprMetric } | null;
}) {
  return (
    <>
      <div className="px-2 pb-1 font-semibold">{item.name}</div>
      {analysis.metrics.map(metric => {
        const sample = metric === 'combined' ? undefined : item.samples[metric];
        const stage = metric === 'combined' ? undefined : analysis.stages[metric];
        return (
          <div
            key={metric}
            data-metric={metric}
            data-active={hoveredBar?.key === item.key && hoveredBar.metric === metric}
            className="space-y-1 rounded-md px-2 py-1.5 data-[active=true]:bg-muted data-[active=true]:ring-1 data-[active=true]:ring-border"
          >
            <div className="flex items-center gap-2 font-medium">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: chartConfig[metric].color }}
                aria-hidden="true"
              />
              <span className="flex-1">{aprMetrics[metric].label}</span>
              <span className="font-semibold tabular-nums">{formatRate(item.values[metric])}</span>
            </div>
            {sample && stage && (
              <div className="pl-[18px] text-muted-foreground">
                <div>
                  {aprMetrics[metric].from}: {sample.count} / {stage.startTotal} (
                  {sample.startShare.toFixed(1)}%)
                </div>
                <div>
                  {aprMetrics[metric].to}: {sample.advanced} / {stage.endTotal} (
                  {sample.endShare.toFixed(1)}%)
                </div>
              </div>
            )}
            {metric === 'combined' && item.combinedParts && (
              <div className="pl-[18px] text-muted-foreground">
                <div>Field → Day 2: {formatRate(item.combinedParts.fieldDay2.apr)}</div>
                <div>Day 2 → Top 8: {formatRate(item.combinedParts.day2Top8.apr)}</div>
                <div>
                  {analysis.combined.fieldDay2.tournamentCount} shared tournament
                  {analysis.combined.fieldDay2.tournamentCount === 1 ? '' : 's'}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function PointerTooltipContent({
  item,
  analysis,
  interaction,
}: {
  item: AprChartItem;
  analysis: AprAnalysis;
  interaction: AprInteractionStore;
}) {
  const hoveredBar = useStore(interaction, state => state.bar);
  return <AprTooltipContent item={item} analysis={analysis} hoveredBar={hoveredBar} />;
}

export const AprChartTooltip = memo(function AprChartTooltip({
  interaction,
  analysis,
  viewportRef,
  portal,
  offset,
}: {
  interaction: AprInteractionStore;
  analysis: AprAnalysis;
  viewportRef: RefObject<HTMLDivElement | null>;
  portal: HTMLDivElement | null;
  offset: number;
}) {
  const hidden = useStore(interaction, state => state.hidden || state.keyboardIndex !== null);
  return (
    <ChartTooltip
      shared
      filterNull={false}
      isAnimationActive={false}
      active={hidden ? false : undefined}
      cursor={{ fillOpacity: 0.6, stroke: 'none' }}
      portal={portal}
      wrapperStyle={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      content={({ active, payload, coordinate }) => {
        const item = payload?.[0]?.payload as AprChartItem | undefined;
        if (!active || !item) return null;
        return (
          <AprTooltipContainer
            viewportRef={viewportRef}
            valuesWidth={analysis.metrics.length * APR_VALUE_COLUMN_WIDTH}
            coordinate={{ x: coordinate?.x, y: (coordinate?.y ?? 0) + offset + APR_HEADER_HEIGHT }}
          >
            <PointerTooltipContent item={item} analysis={analysis} interaction={interaction} />
          </AprTooltipContainer>
        );
      }}
    />
  );
});

export function AprKeyboardTooltip({
  data,
  analysis,
  interaction,
  viewportRef,
  rowHeight,
}: {
  data: AprChartItem[];
  analysis: AprAnalysis;
  interaction: AprInteractionStore;
  viewportRef: RefObject<HTMLDivElement | null>;
  rowHeight: number;
}) {
  const index = useStore(interaction, state => (state.hidden ? null : state.keyboardIndex));
  const item = index === null ? undefined : data[index];
  return (
    <>
      <span className="sr-only" role="status">
        {item &&
          `${item.name}. ${analysis.metrics.map(metric => `${aprMetrics[metric].label}: ${formatRate(item.values[metric])}`).join('. ')}`}
      </span>
      {item && index !== null && (
        <div className="pointer-events-none absolute inset-0 z-10" data-apr-keyboard-tooltip>
          <AprTooltipContainer
            anchorXToViewport
            viewportRef={viewportRef}
            valuesWidth={analysis.metrics.length * APR_VALUE_COLUMN_WIDTH}
            coordinate={{
              x: APR_LABEL_WIDTH + 24,
              y: APR_HEADER_HEIGHT + APR_PLOT_TOP + (index + 0.5) * rowHeight,
            }}
          >
            <AprTooltipContent item={item} analysis={analysis} hoveredBar={null} />
          </AprTooltipContainer>
        </div>
      )}
    </>
  );
}
