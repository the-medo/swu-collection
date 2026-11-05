import {
  memo,
  useLayoutEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils.ts';
import { aprMetrics, type AprMetric } from './tournamentMetaApr.ts';
import {
  APR_HEADER_HEIGHT,
  APR_LABEL_WIDTH,
  APR_VALUE_COLUMN_WIDTH,
  chartConfig,
  formatRate,
  type AprChartItem,
} from './tournamentMetaAprPresentation.ts';

interface Props {
  metrics: AprMetric[];
  sortMetric: AprMetric;
  rowCount: number;
  height: number;
  viewportRef: RefObject<HTMLDivElement | null>;
  labelPortalRef: Ref<HTMLDivElement>;
  valuesPortalRef: Ref<HTMLDivElement>;
  children: ReactNode;
  footer: ReactNode;
  onKeyDown: HTMLAttributes<HTMLDivElement>['onKeyDown'];
  onScroll: HTMLAttributes<HTMLDivElement>['onScroll'];
  describedBy: string;
}

/** One scroll surface keeps the plot, artwork and stage columns together. */
export default function TournamentMetaAprFrame({
  metrics,
  sortMetric,
  rowCount,
  height,
  viewportRef,
  labelPortalRef,
  valuesPortalRef,
  children,
  footer,
  onKeyDown,
  onScroll,
  describedBy,
}: Props) {
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setOverflows(viewport.scrollWidth > viewport.clientWidth + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    measure();
    return () => observer.disconnect();
  }, [viewportRef]);
  const valuesWidth = metrics.length * APR_VALUE_COLUMN_WIDTH;
  const plotWidth = `calc(100% - ${valuesWidth}px)`;
  return (
    <>
      <div
        ref={viewportRef}
        className="isolate overflow-auto rounded-md border"
        style={{
          // Keep the batch sentinel below the viewport; short complete lists can fit their scrollbar.
          maxHeight: footer ? Math.min(640, height + APR_HEADER_HEIGHT + 2) : 640,
          scrollPaddingTop: APR_HEADER_HEIGHT,
          scrollPaddingLeft: APR_LABEL_WIDTH,
        }}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        aria-describedby={describedBy}
        tabIndex={0}
        role="region"
        aria-label="APR chart, scroll to see all decks"
      >
        <div className="relative" style={{ minWidth: 360 + valuesWidth }}>
          <div
            className="sticky top-0 z-20 flex items-center border-b bg-card text-xs font-medium text-muted-foreground"
            style={{ width: plotWidth, height: APR_HEADER_HEIGHT }}
          >
            <span className="w-[140px] shrink-0" />
            <span className="flex-1 text-center">Adjusted performance rate</span>
          </div>
          <div className="relative" style={{ width: plotWidth, height }}>
            {children}
          </div>
          <div
            ref={labelPortalRef}
            className="pointer-events-none absolute inset-x-0 z-10"
            style={{ top: APR_HEADER_HEIGHT, height }}
          />
          <div className="pointer-events-none absolute inset-0 z-30">
            <div
              className="sticky left-0 top-0 flex w-[140px] items-center justify-end border-b bg-card px-3 text-xs font-medium text-muted-foreground"
              style={{ height: APR_HEADER_HEIGHT }}
            >
              Deck / group
            </div>
          </div>
          <div
            role="table"
            aria-label="APR values and sample counts"
            aria-rowcount={rowCount + 1}
            aria-colcount={metrics.length + 1}
            className="absolute inset-y-0 right-0 border-l"
            style={{ width: valuesWidth }}
          >
            <div role="rowgroup" className="sticky top-0 z-20 bg-card">
              <div
                role="row"
                aria-rowindex={1}
                className="grid border-b"
                style={{
                  height: APR_HEADER_HEIGHT,
                  gridTemplateColumns: `repeat(${metrics.length}, 1fr)`,
                }}
              >
                <span role="columnheader" className="sr-only">
                  Deck / group
                </span>
                {metrics.map(metric => (
                  <div
                    key={metric}
                    role="columnheader"
                    aria-sort={metric === sortMetric ? 'descending' : undefined}
                    className="flex items-center justify-center gap-1.5 border-l px-2 text-center text-[11px] font-medium leading-tight first-of-type:border-l-0"
                  >
                    <span
                      className="size-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: chartConfig[metric].color }}
                      aria-hidden="true"
                    />
                    {aprMetrics[metric].label}
                  </div>
                ))}
              </div>
            </div>
            <div ref={valuesPortalRef} role="rowgroup" className="relative" style={{ height }} />
          </div>
        </div>
        {footer}
      </div>
      {overflows && (
        <p className="mt-2 text-xs text-muted-foreground">
          Scroll sideways to see all APR columns.
        </p>
      )}
    </>
  );
}

interface AprValueRowProps {
  item: AprChartItem;
  y: number;
  height: number;
  index: number;
  metrics: AprMetric[];
  active: boolean;
}

const AprValueRow = memo(function AprValueRow({
  item,
  y,
  height,
  index,
  metrics,
  active,
}: AprValueRowProps) {
  return (
    <div
      key={item.key}
      role="row"
      aria-rowindex={index + 2}
      data-apr-values={item.key}
      data-active={active}
      className="absolute inset-x-0 grid border-b data-[active=true]:bg-muted/50"
      style={{
        top: y - height / 2,
        height,
        gridTemplateColumns: `repeat(${metrics.length}, 1fr)`,
      }}
      title={item.name}
    >
      <span role="rowheader" className="sr-only">
        {item.name}
      </span>
      {metrics.map(metric => {
        const sample = metric === 'combined' ? undefined : item.samples[metric];
        const rate = formatRate(item.values[metric]);
        const rounded = parseFloat(rate);
        return (
          <div
            key={metric}
            role="cell"
            data-apr-value={metric}
            className="flex min-w-0 flex-col items-center justify-center border-l px-2 text-center tabular-nums first-of-type:border-l-0"
          >
            <span
              className={cn(
                'text-xs font-medium',
                rounded > 0 && 'text-green-700 dark:text-green-400',
                rounded < 0 && 'text-red-600 dark:text-red-400',
                !rounded && 'text-muted-foreground',
              )}
              data-apr-rate
            >
              {rate}
            </span>
            {sample && (
              <span className="mt-1 block text-[10px] leading-tight text-muted-foreground">
                {sample.count} → {sample.advanced} decks
              </span>
            )}
            {metric === 'combined' && item.combinedParts && (
              <span className="mt-1 block text-[10px] leading-tight text-muted-foreground">
                {item.combinedParts.fieldDay2.count} → {item.combinedParts.fieldDay2.advanced} →{' '}
                {item.combinedParts.day2Top8.advanced} decks
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

export function AprValuesRows({
  rows,
  metrics,
  portal,
  activeKey,
}: {
  rows: { item: AprChartItem; y: number; height: number; index: number }[];
  metrics: AprMetric[];
  portal: HTMLDivElement | null;
  activeKey?: string;
}) {
  if (!portal) return null;
  return createPortal(
    rows.map(row => (
      <AprValueRow
        key={row.item.key}
        {...row}
        metrics={metrics}
        active={activeKey === row.item.key}
      />
    )),
    portal,
  );
}
