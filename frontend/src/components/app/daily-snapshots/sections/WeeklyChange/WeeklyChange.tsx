import { TrendingUp } from 'lucide-react';
import * as React from 'react';
import { useMemo, useState } from 'react';
import { ResponsiveAreaBump } from '@nivo/bump';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionWeeklyChange,
  TournamentGroupExtendedInfo,
} from '../../../../../../../types/DailySnapshots.ts';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import type { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { type DailySnapshotMetaPart } from '../MetaShareTwoWeeks/MetaPartSelector.tsx';
import { type DailySnapshotMetaView } from '../MetaShareTwoWeeks/MetaViewSelector.tsx';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { buildWeeklyChangeChartData, getWeeklyChangeStats } from './weeklyChangeData.ts';
import WeeklyChangeAreaBumpTooltip from '@/components/app/daily-snapshots/sections/WeeklyChange/WeeklyChangeAreaBumpTooltip.tsx';
import { ArrowCell } from '@/components/app/daily-snapshots/sections/WeeklyChange/ArrowCell.tsx';
import WeeklyChangeDropdownMenu from '@/components/app/daily-snapshots/sections/WeeklyChange/WeeklyChangeDropdownMenu.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import MetaFilters from '../components/MetaFilters.tsx';
import MetaEmptyState from '../components/MetaEmptyState.tsx';
import { useReducedMotion } from 'motion/react';

export interface WeeklyChangeProps {
  payload: DailySnapshotSectionData<SectionWeeklyChange>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

const TOP_X = 6;

const WeeklyChange: React.FC<WeeklyChangeProps> = ({
  payload,
  dailySnapshot,
  sectionUpdatedAt,
}) => {
  // selectors
  const [metaPart, setMetaPart] = useState<DailySnapshotMetaPart>('total'); // winners => champions mapping
  const [metaView, setMetaView] = useState<DailySnapshotMetaView>('leadersAndBase');

  // metaInfo for colors/labels based on view
  const metaInfo: MetaInfo = metaView === 'leaders' ? 'leaders' : 'leadersAndBase';
  const colorDefsFactory = useChartColorsAndGradients();
  const labelRenderer = useLabel();
  const reducedMotion = useReducedMotion();

  // active series for the always-visible details panel (defaults to top series)
  const [activeDeckKey, setActiveDeckKey] = useState<string | null>(null);

  const stats = useMemo(
    () => getWeeklyChangeStats(payload.data.dataPoints, metaView),
    [payload.data.dataPoints, metaView],
  );

  const { chartData, chartDefs, fill } = useMemo(() => {
    const clean = (s: string) => s.replace(/^Weekend\s+/i, '').trim();
    const chartData = buildWeeklyChangeChartData(
      stats,
      metaPart === 'winners' ? 'champions' : metaPart,
      [
        clean(payload.data.week1Ext?.tournamentGroup?.name ?? 'Week 1'),
        clean(payload.data.week2Ext?.tournamentGroup?.name ?? 'Week 2'),
      ],
      TOP_X,
    );
    return {
      chartData,
      chartDefs: chartData.map(item => colorDefsFactory(item.id, metaInfo)),
      fill: chartData.map(item => ({ match: { id: item.id }, id: item.id })),
    };
  }, [
    stats,
    payload.data.week1Ext?.tournamentGroup?.name,
    payload.data.week2Ext?.tournamentGroup?.name,
    metaPart,
    colorDefsFactory,
    metaInfo,
  ]);

  // Labels: only on the right side like WeekToWeek
  const endLabel = useMemo(() => {
    return (d: { id: string; data: Array<{ x: string; y: number }> }) => {
      const l = d.data?.length || 0;
      if (!l) return '';
      if (d.data[l - 1]?.y === 0) return '';
      return (labelRenderer(d.id as string, metaInfo, 'text') as string) ?? '';
    };
  }, [labelRenderer, metaInfo]);

  // Render-time labels (cleaned), to show under the chart
  const { x1LabelRender, x2LabelRender } = React.useMemo(() => {
    const clean = (s: string) => s.replace(/^Weekend\s+/i, '').trim();
    const x1Raw = payload.data.week1Ext?.tournamentGroup?.name;
    const x2Raw = payload.data.week2Ext?.tournamentGroup?.name;
    return {
      x1LabelRender: x1Raw ? clean(x1Raw) : 'Week 1',
      x2LabelRender: x2Raw ? clean(x2Raw) : 'Week 2',
    };
  }, [payload.data.week1Ext?.tournamentGroup?.name, payload.data.week2Ext?.tournamentGroup?.name]);

  // Info tooltip tournament groups
  const groups: TournamentGroupExtendedInfo[] = [
    payload.data.week1Ext,
    payload.data.week2Ext,
  ].filter(Boolean) as TournamentGroupExtendedInfo[];

  const selectedDeckKey = chartData.some(serie => serie.id === activeDeckKey)
    ? activeDeckKey
    : (chartData[0]?.id ?? null);

  return (
    <div className="meta-section-content flex flex-col gap-4.5 w-full h-full min-w-0">
      <SectionHeader
        title="Weekly change"
        icon={TrendingUp}
        description="Last two weeks · How the field is shifting"
        info={
          <>
            <SectionInfoTooltip
              dailySnapshot={dailySnapshot}
              sectionUpdatedAt={sectionUpdatedAt}
              sectionDataWarning={true}
              tournamentGroupExtendedInfo={groups}
            >
              <div>
                This section compares meta share over the last two weekends, including the current
                weekend when available.
              </div>
              <div>
                Band widths show percentages of each week’s field, including unknown decks in the
                totals.
              </div>
              <div>
                Values in chart are sorted from the most played (on top) to less played.
                <ul className="list-disc ml-4">
                  <li>
                    <span className="font-bold">total / top 8</span> - compares meta share of{' '}
                    {TOP_X} most played leaders (+bases) from both weeks
                  </li>
                  <li>
                    <span className="font-bold">champions</span> - all winning leaders (+bases) are
                    included in the chart
                  </li>
                </ul>
              </div>
              <div>
                In table, multiple leaders (+bases) can show the same placement (eg. 1st, 2nd, 3rd)
                in case they have the same count. In this case, the "best" shared placement is
                shown.
              </div>
              <div>
                Arrows in the table <ArrowCell p1={10} p2={1} /> <ArrowCell p1={1} p2={10} /> show
                change in placement and are not visible in case the placement did not change between
                weeks.
              </div>
            </SectionInfoTooltip>
          </>
        }
        dropdownMenu={<WeeklyChangeDropdownMenu />}
      />
      <MetaFilters
        metaPart={metaPart}
        setMetaPart={setMetaPart}
        metaView={metaView}
        setMetaView={setMetaView}
      />

      {chartData.length === 0 ? (
        <MetaEmptyState title="Waiting for the weekly picture" icon={TrendingUp}>
          Compare the rise and fall of leaders once results from both weeks are available.
        </MetaEmptyState>
      ) : (
        <div className="w-full overflow-visible">
          <div className="meta-weekly-layout flex items-start flex-wrap gap-4.5">
            <div className="meta-weekly-chart flex-[2_1_250px] min-w-0">
              <div className="h-[250px] w-full">
                <ResponsiveAreaBump
                  data={chartData}
                  animate={!reducedMotion}
                  margin={{ top: 0, right: 10, bottom: 0, left: 10 }}
                  spacing={4}
                  colors={['#3B3B3B']}
                  blendMode="normal"
                  defs={chartDefs}
                  fill={fill}
                  tooltip={() => null}
                  axisTop={null}
                  axisBottom={null}
                  startLabel={() => ''}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  endLabel={endLabel as any}
                  endLabelTextColor={'hsl(var(--muted-foreground))'}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onMouseEnter={(serie: any) => setActiveDeckKey(serie.id as string)}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(serie: any) => setActiveDeckKey(serie.id as string)}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground flex justify-between px-1 w-full">
                <span className="truncate" title={x1LabelRender}>
                  {x1LabelRender}
                </span>
                <span className="truncate" title={x2LabelRender}>
                  {x2LabelRender}
                </span>
              </div>
            </div>

            <div className="meta-weekly-selection flex-[1_1_230px] min-w-0">
              {selectedDeckKey ? (
                <WeeklyChangeAreaBumpTooltip
                  deckKey={selectedDeckKey}
                  metaInfo={metaInfo}
                  payload={payload}
                  stats={stats}
                  labelRenderer={labelRenderer}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Hover or click a line to see details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyChange;
