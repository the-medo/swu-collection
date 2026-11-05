import { useCallback, useId, useMemo, useState } from 'react';
import { ResponsiveScatterPlot, type ScatterPlotNodeProps } from '@nivo/scatterplot';
import { buildMetaMapPoints, type MetaMapPoint } from './tournamentMetaMap.ts';
import type { AnalysisDataItem } from './tournamentMetaLib.ts';
import type { MetaInfo } from './MetaInfoSelector.tsx';
import { useLabel } from './useLabel.tsx';
import { useChartColorsAndGradients } from './useChartColorsAndGradients.tsx';
import { useTournamentMetaActions } from './useTournamentMetaStore.ts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import TournamentMetaMapDetails from './TournamentMetaMapDetails.tsx';

interface MapDatum extends MetaMapPoint {
  name: string;
  colors: { offset: number; color: string }[];
  dimmed: boolean;
  highlighted: boolean;
}

interface Props {
  analysisData: AnalysisDataItem[];
  totalDecks: number;
  metaInfo: MetaInfo;
  highlightedKeys: ReadonlySet<string>;
  isHighlighting: boolean;
}

function MapBubble({
  node,
  onInspect,
  onSelect,
  metaInfo,
}: Pick<ScatterPlotNodeProps<MapDatum>, 'node'> & {
  onInspect: (key: string) => void;
  onSelect: (key: string) => void;
  metaInfo: MetaInfo;
}) {
  const gradientId = useId();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const point = node.data;
  return (
    <Tooltip
      delayDuration={100}
      disableHoverableContent
      open={tooltipOpen}
      onOpenChange={setTooltipOpen}
    >
      <TooltipTrigger asChild>
        <g
          transform={`translate(${node.x},${node.y})`}
          tabIndex={0}
          role="button"
          aria-label={`${point.name}: ${point.x.toFixed(1)}% win rate, ${point.y.toFixed(1)}% meta share, ${point.count} occurrences. View decks.`}
          className="group cursor-pointer outline-none"
          opacity={point.dimmed ? 0.2 : 1}
          onMouseEnter={() => onInspect(point.key)}
          onClick={() => {
            setTooltipOpen(false);
            onInspect(point.key);
            onSelect(point.key);
          }}
          onFocus={() => onInspect(point.key)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setTooltipOpen(false);
              onSelect(point.key);
            }
          }}
        >
          <defs>
            <linearGradient id={gradientId}>
              {point.colors.map((stop, index) => (
                <stop key={index} offset={`${stop.offset}%`} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>
          <circle r={Math.max(10, node.size / 2)} fill="transparent" />
          <circle
            r={node.size / 2}
            fill={`url(#${gradientId})`}
            fillOpacity={0.8}
            stroke="hsl(var(--foreground))"
            strokeOpacity={point.highlighted ? 1 : 0.35}
            strokeWidth={point.highlighted ? 2.5 : 1}
            className="group-hover:stroke-foreground group-hover:stroke-2 group-focus-visible:stroke-foreground group-focus-visible:stroke-[3] group-focus-visible:stroke-opacity-100"
          />
          {node.size >= 24 && (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              stroke="#171717"
              strokeWidth={2.5}
              paintOrder="stroke"
              className="pointer-events-none text-[10px] font-semibold tabular-nums"
            >
              {point.count}
            </text>
          )}
        </g>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={12}
        collisionPadding={12}
        className="pointer-events-none w-80 max-w-[calc(100vw-1.5rem)] rounded-xl p-0 shadow-xl"
        aria-label={`${point.name}: ${point.x.toFixed(1)}% win rate, ${point.y.toFixed(1)}% meta share, ${point.count} occurrences, ${point.wins} wins and ${point.losses} losses.`}
        data-meta-map-tooltip
      >
        <TournamentMetaMapDetails point={point} metaInfo={metaInfo} />
      </TooltipContent>
    </Tooltip>
  );
}

const percent = (value: number) => `${value}%`;
const chartTheme = {
  text: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
  axis: {
    ticks: { text: { fill: 'hsl(var(--muted-foreground))' } },
    legend: { text: { fill: 'hsl(var(--foreground))', fontSize: 12 } },
  },
  grid: { line: { stroke: 'hsl(var(--border))', strokeDasharray: '3 4' } },
};

export default function TournamentMetaMap({
  analysisData,
  totalDecks,
  metaInfo,
  highlightedKeys,
  isHighlighting,
}: Props) {
  const id = useId();
  const label = useLabel();
  const gradient = useChartColorsAndGradients();
  const { setTournamentDeckKey } = useTournamentMetaActions();
  const [inspectedKey, setInspectedKey] = useState<string>();
  const points = useMemo(
    () =>
      buildMetaMapPoints(analysisData, totalDecks).map(point => {
        const colors = gradient(point.key, metaInfo).colors;
        return {
          ...point,
          name:
            point.key === 'no-aspect'
              ? 'No aspect'
              : String(label(point.key, metaInfo, 'text') || point.key).trim(),
          colors: colors.length ? colors : [{ offset: 0, color: '#777777' }],
          dimmed: isHighlighting && !highlightedKeys.has(point.key),
          highlighted: isHighlighting && highlightedKeys.has(point.key),
        };
      }),
    [analysisData, totalDecks, metaInfo, label, gradient, highlightedKeys, isHighlighting],
  );
  const data = useMemo(() => [{ id: 'Deck groups', data: points }], [points]);
  const inspected = points.find(point => point.key === inspectedKey);
  const excluded = analysisData.length - points.length;
  const yMax = Math.max(
    10,
    Math.ceil((Math.max(...points.map(point => point.y), 0) * 1.1) / 5) * 5,
  );
  const select = useCallback(
    (key: string) => setTournamentDeckKey({ key, metaInfo }),
    [setTournamentDeckKey, metaInfo],
  );
  const renderBubble = useCallback(
    (props: ScatterPlotNodeProps<MapDatum>) => (
      <MapBubble
        node={props.node}
        onInspect={setInspectedKey}
        onSelect={select}
        metaInfo={metaInfo}
      />
    ),
    [select, metaInfo],
  );

  return (
    <section
      className="min-w-0 rounded-lg border bg-card p-3 sm:p-5"
      aria-labelledby={`${id}-title`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${id}-title`} className="text-lg font-semibold">
          Meta plot
        </h3>
        <p className="text-xs text-muted-foreground">
          {points.length} deck groups · Bubble size reflects occurrences
        </p>
      </div>
      <p id={`${id}-description`} className="mt-1 text-sm text-muted-foreground">
        Higher win rates to the right, larger meta shares toward the top. Hover or focus a bubble
        for details; select it to view decks. Small samples are enlarged for visibility.
      </p>
      {excluded > 0 && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {excluded} {excluded === 1 ? 'group has' : 'groups have'} no recorded wins or losses and
          cannot be plotted. Their occurrences still count toward meta share.
        </p>
      )}
      {points.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No win rate data available for the selected filters.
        </p>
      ) : (
        <>
          <div className="h-[420px] w-full sm:h-[520px]">
            <ResponsiveScatterPlot<MapDatum>
              data={data}
              margin={{ top: 36, right: 34, bottom: 64, left: 64 }}
              xScale={{ type: 'linear', min: 0, max: 100 }}
              yScale={{ type: 'linear', min: 0, max: yMax }}
              xFormat={value => `${Number(value).toFixed(1)}%`}
              yFormat={value => `${Number(value).toFixed(1)}%`}
              axisBottom={{
                tickValues: [0, 25, 50, 75, 100],
                format: percent,
                legend: 'Win rate →',
                legendPosition: 'middle',
                legendOffset: 44,
              }}
              axisLeft={{
                tickValues: 5,
                format: percent,
                legend: 'Meta share →',
                legendPosition: 'middle',
                legendOffset: -48,
              }}
              gridXValues={[0, 25, 50, 75, 100]}
              gridYValues={5}
              nodeId={node => node.data.key}
              nodeSize={node => node.data.size}
              nodeComponent={renderBubble}
              theme={chartTheme}
              animate={false}
              useMesh={false}
              role="group"
              ariaLabel="Win rate and meta share bubble chart"
              ariaDescribedBy={`${id}-description`}
              markers={[
                {
                  axis: 'x',
                  value: 50,
                  lineStyle: {
                    stroke: 'hsl(var(--muted-foreground))',
                    strokeWidth: 1,
                    strokeDasharray: '6 4',
                  },
                },
              ]}
            />
          </div>
          <div className="min-h-32" aria-live="polite" aria-atomic="true">
            {inspected ? (
              <TournamentMetaMapDetails point={inspected} metaInfo={metaInfo} panel />
            ) : (
              <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                Hover, tap, or focus a bubble to inspect its deck group.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
