import { useState } from 'react';
import { ChartPie, ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsivePie, type PieCustomLayerProps } from '@nivo/pie';
import type { DailySnapshotRow } from '@/api/daily-snapshot';
import {
  baseDistributionCategories,
  type BaseDistributionCategory,
  type DailySnapshotSectionData,
  type SectionBaseDistribution,
} from '../../../../../../../types/DailySnapshots.ts';
import { SwuAspect } from '../../../../../../../types/enums.ts';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { cn } from '@/lib/utils.ts';
import MetaPartSelector, {
  type DailySnapshotMetaPart,
} from '../MetaShareTwoWeeks/MetaPartSelector.tsx';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import MetaEmptyState from '../components/MetaEmptyState.tsx';

interface BaseDistributionProps {
  payload: DailySnapshotSectionData<SectionBaseDistribution>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

const categoryDisplay: Record<BaseDistributionCategory, { label: string; color: string }> = {
  force: { label: 'Force', color: '#8b5cf6' },
  endor: { label: 'Endor', color: '#16a34a' },
  tatooine: { label: 'Tatooine', color: '#d97706' },
  kashyyyk: { label: 'Kashyyyk', color: '#0d9488' },
  naboo: { label: 'Naboo', color: '#3b82f6' },
  splash: { label: 'Splash', color: '#ec4899' },
  nonbasic: { label: 'Nonbasic', color: '#ef4444' },
  'other-basic': { label: 'Other basic', color: '#94a3b8' },
};

const aspects = [
  SwuAspect.VIGILANCE,
  SwuAspect.COMMAND,
  SwuAspect.AGGRESSION,
  SwuAspect.CUNNING,
  SwuAspect.VILLAINY,
  SwuAspect.HEROISM,
];

const tableCategoryOrder: Record<BaseDistributionCategory, number> = {
  endor: 0,
  tatooine: 1,
  kashyyyk: 2,
  naboo: 3,
  force: 4,
  splash: 5,
  nonbasic: 6,
  'other-basic': 7,
};
const tableCategories = [...baseDistributionCategories].sort(
  (a, b) => tableCategoryOrder[a] - tableCategoryOrder[b],
);
const tableColumns = ['total', ...aspects] as const;

type PieDatum = { id: BaseDistributionCategory; label: string; value: number; color: string };

function MatchCount({ centerX, centerY, dataWithArc }: PieCustomLayerProps<PieDatum>) {
  const count = dataWithArc.reduce((sum, datum) => sum + datum.value, 0);
  return (
    <g className="fill-foreground" textAnchor="middle">
      <text x={centerX} y={centerY} dominantBaseline="central" className="text-xl font-bold">
        {count.toLocaleString()}
      </text>
    </g>
  );
}

export default function BaseDistribution({
  payload,
  dailySnapshot,
  sectionUpdatedAt,
}: BaseDistributionProps) {
  const [part, setPart] = useState<DailySnapshotMetaPart>('total');
  const [showAspects, setShowAspects] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    row?: BaseDistributionCategory | 'total';
    column?: SwuAspect | 'total';
  } | null>(null);
  const selected = payload.data.twoWeeks[part === 'winners' ? 'champions' : part];
  const partLabel = part === 'total' ? 'Total' : part === 'top8' ? 'Top 8' : 'Champions';
  const chartData: PieDatum[] = baseDistributionCategories
    .map(id => ({
      id,
      ...categoryDisplay[id],
      value: selected.categories[id].count,
    }))
    .sort((a, b) => b.value - a.value);
  const matchCount = chartData.reduce((sum, datum) => sum + datum.value, 0);
  const hoveredCategory = hoveredCell?.row;
  const activeCategory =
    showAspects &&
    hoveredCategory &&
    hoveredCategory !== 'total' &&
    selected.categories[hoveredCategory].count > 0
      ? hoveredCategory
      : undefined;
  const categoryRows = tableCategories.map(id => ({
    id,
    label: categoryDisplay[id].label,
    values: aspects.map(aspect => selected.categories[id].aspects[aspect]),
  }));
  const tableRows = [
    ...categoryRows,
    {
      id: 'total' as const,
      label: 'Total',
      values: aspects.map((_, index) =>
        categoryRows.reduce((sum, row) => sum + row.values[index], 0),
      ),
    },
  ].map(row => ({
    ...row,
    values: [row.values.reduce((sum, value) => sum + value, 0), ...row.values],
  }));

  return (
    <div className="meta-section-content flex flex-col gap-4.5 w-full h-full min-w-0">
      <SectionHeader
        title="Base distribution"
        icon={ChartPie}
        description="Base traits and abilities · Last 2 weeks"
        info={
          <SectionInfoTooltip
            dailySnapshot={dailySnapshot}
            sectionDataWarning
            sectionUpdatedAt={sectionUpdatedAt}
            tournamentGroupExtendedInfo={
              payload.data.twoWeeksGroupExt ? [payload.data.twoWeeksGroupExt] : []
            }
          >
            <p>
              Bases count in every applicable category. For example, Daimyo’s Palace counts as both
              Tatooine and Splash, and Lake Country as both Naboo and Nonbasic. Force includes
              common and rare Force bases; Splash bases ignore an aspect penalty.
            </p>
            <p>
              Pie slices show shares of category matches, which can exceed the number of decks. Each
              table cell counts decks with that base category and an aspect provided by their leader
              or base. A repeated aspect counts only once per deck in each row. Entries with an
              unknown base are excluded; unknown leaders contribute only the base’s aspects. Totals
              add the displayed aspect counts, so a deck can contribute to several aspects and
              categories.
            </p>
          </SectionInfoTooltip>
        }
      />

      <MetaPartSelector
        value={part}
        onChange={value => {
          setPart(value);
          setHoveredCell(null);
        }}
        ariaLabel="Base distribution results"
        className="self-start flex-wrap rounded-lg border bg-background/70 p-0.5 gap-0.5 [&_button]:h-8 [&_button]:px-2.5 [&_button]:text-xs [&_button[data-state=on]]:bg-[var(--meta-accent)] [&_button[data-state=on]]:text-card"
      />

      {selected.deckCount === 0 ? (
        <MetaEmptyState title="No base data yet" icon={ChartPie}>
          No {part === 'total' ? 'decks' : part === 'top8' ? 'top 8 decks' : 'champions'} with known
          bases in this snapshot.
        </MetaEmptyState>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-36 w-36"
              role="img"
              aria-label={`${partLabel}: ${matchCount} base category matches across ${selected.deckCount} decks. Counts are listed below.`}
            >
              <ResponsivePie<PieDatum>
                data={chartData.filter(datum => datum.value > 0)}
                margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                innerRadius={0.72}
                padAngle={1}
                animate={false}
                activeOuterRadiusOffset={3}
                activeId={showAspects ? (activeCategory ?? null) : undefined}
                onMouseEnter={datum => {
                  if (showAspects) setHoveredCell({ row: datum.data.id });
                }}
                onMouseLeave={() => {
                  if (showAspects) setHoveredCell(null);
                }}
                colors={({ data }) =>
                  activeCategory && activeCategory !== data.id ? `${data.color}66` : data.color
                }
                enableArcLabels={false}
                enableArcLinkLabels={false}
                layers={['arcs', MatchCount]}
                tooltip={({ datum }) => (
                  <div className="w-52 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    {datum.label}: {datum.value.toLocaleString()} decks
                    <div className="text-muted-foreground">
                      {Math.round((datum.value / matchCount) * 100)}% of category matches
                    </div>
                  </div>
                )}
              />
            </div>
            <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {chartData.map(datum => (
                <div key={datum.id} className="flex items-center justify-between gap-1">
                  <dt className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: datum.color }}
                    />
                    {datum.label}
                  </dt>
                  <dd className="font-medium tabular-nums">{datum.value.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
            <p className="m-0! text-[11px]! text-muted-foreground">
              {selected.deckCount.toLocaleString()} decks · Categories can overlap.
            </p>
          </div>

          <Collapsible
            open={showAspects}
            onOpenChange={open => {
              setShowAspects(open);
              setHoveredCell(null);
            }}
          >
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full text-xs">
                {showAspects ? 'Hide by aspect' : 'Show by aspect'}
                {showAspects ? (
                  <ChevronUp aria-hidden="true" />
                ) : (
                  <ChevronDown aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-x-auto pt-3">
              <table
                className="w-full min-w-75 text-xs tabular-nums"
                onMouseLeave={() => setHoveredCell(null)}
              >
                <caption
                  className="pb-2 text-left font-medium text-muted-foreground"
                  onMouseEnter={() => setHoveredCell(null)}
                >
                  {partLabel} decks by aspect
                </caption>
                <thead>
                  <tr className="border-b-[3px] border-b-muted-foreground/60">
                    <th
                      scope="col"
                      className="relative py-2 pr-1 text-left font-medium"
                      onMouseEnter={() => setHoveredCell(null)}
                    >
                      <span className="sr-only">Base</span>
                    </th>
                    {tableColumns.map(column => (
                      <th
                        key={column}
                        scope="col"
                        className={cn(
                          'relative p-1',
                          column === 'total' && 'border-r-[3px] border-r-muted-foreground/60',
                          hoveredCell?.column === column && 'bg-[var(--meta-tint)]',
                        )}
                        title={column === 'total' ? 'Sum of aspects' : column}
                        onMouseEnter={() => setHoveredCell({ column })}
                      >
                        {column === 'total' ? (
                          <span className="sr-only">Total</span>
                        ) : (
                          <span className="flex justify-center">
                            <AspectIcon aspect={column} size="small" />
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(row => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b last:border-b-0',
                        (row.id === 'naboo' || row.id === 'other-basic') &&
                          'border-b-[3px] border-b-muted-foreground/60',
                        row.id === 'total' && 'font-semibold',
                      )}
                    >
                      <th
                        scope="row"
                        className={cn(
                          'py-2 pr-1 text-left font-medium whitespace-nowrap',
                          row.id === 'total' && 'font-semibold',
                          hoveredCell?.row === row.id && 'bg-[var(--meta-tint)]',
                        )}
                        onMouseEnter={() => setHoveredCell({ row: row.id })}
                      >
                        {row.label}
                      </th>
                      {tableColumns.map((column, columnIndex) => (
                        <td
                          key={column}
                          className={cn(
                            'px-1 py-2 text-center',
                            column === 'total' &&
                              'border-r-[3px] border-r-muted-foreground/60 font-semibold',
                            (hoveredCell?.row === row.id || hoveredCell?.column === column) &&
                              'bg-[var(--meta-tint)]',
                            hoveredCell?.row === row.id &&
                              hoveredCell?.column === column &&
                              'bg-[var(--meta-accent)] text-card',
                          )}
                          onMouseEnter={() => setHoveredCell({ row: row.id, column })}
                        >
                          {row.values[columnIndex].toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
