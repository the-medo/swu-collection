import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveAreaBump } from '@nivo/bump';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionWeeklyChange,
  TournamentGroupExtendedInfo,
} from '../../../../../../../types/DailySnapshots.ts';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import type { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import MetaPartSelector, {
  type DailySnapshotMetaPart,
} from '../MetaShareTwoWeeks/MetaPartSelector.tsx';
import MetaViewSelector, {
  type DailySnapshotMetaView,
} from '../MetaShareTwoWeeks/MetaViewSelector.tsx';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { getDeckKey2 } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import WeeklyChangeAreaBumpTooltip from '@/components/app/daily-snapshots/sections/WeeklyChange/WeeklyChangeAreaBumpTooltip.tsx';
import { ArrowCell } from '@/components/app/daily-snapshots/sections/WeeklyChange/ArrowCell.tsx';
import WeeklyChangeDropdownMenu from '@/components/app/daily-snapshots/sections/WeeklyChange/WeeklyChangeDropdownMenu.tsx';

export interface WeeklyChangeProps {
  payload: DailySnapshotSectionData<SectionWeeklyChange>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

// AreaBump datum type
interface TwoWeekPoint {
  x: string;
  y: number;
}

const TOP_X = 6;
const fixedKeys = ['unknown', 'others'];

const WeeklyChange: React.FC<WeeklyChangeProps> = ({
  payload,
  dailySnapshot,
  sectionUpdatedAt,
}) => {
  // selectors
  const [metaPart, setMetaPart] = useState<DailySnapshotMetaPart>('total'); // winners => champions mapping
  const [metaView, setMetaView] = useState<DailySnapshotMetaView>('leadersAndBase');
  const { data: cardListData } = useCardList();

  // metaInfo for colors/labels based on view
  const metaInfo: MetaInfo = metaView === 'leaders' ? 'leaders' : 'leadersAndBase';
  const colorDefsFactory = useChartColorsAndGradients();
  const labelRenderer = useLabel();

  // active series for the always-visible details panel (defaults to top series)
  const [activeDeckKey, setActiveDeckKey] = useState<string | null>(null);

  // Build chart data from the payload (two x points: 1 for week1, 2 for week2)
  const { chartData, chartDefs, fill } = useMemo(() => {
    // Group by key depending on metaView
    const grouped = new Map<string, { w1: number; w2: number }>();

    const getPartValue = (obj: { total: number; top8: number; champions: number }) => {
      if (metaPart === 'total') return obj.total ?? 0;
      if (metaPart === 'top8') return obj.top8 ?? 0;
      // metaPart === 'winners' maps to champions in weekly change
      return obj.champions ?? 0;
    };

    payload.data.dataPoints.forEach(dp => {
      const key = fixedKeys.includes(dp.leaderCardId)
        ? dp.leaderCardId
        : getDeckKey2(dp.leaderCardId, dp.baseCardId, metaView, cardListData);

      const prev = grouped.get(key) || { w1: 0, w2: 0 };
      grouped.set(key, {
        w1: prev.w1 + getPartValue(dp.week1),
        w2: prev.w2 + getPartValue(dp.week2),
      });
    });

    grouped.delete('unknown');

    // Resolve x-axis labels from tournament group names (fallbacks if missing)
    const clean = (s: string) => s.replace(/^Weekend\s+/i, '').trim();
    const x1Label = clean(payload.data.week1Ext?.tournamentGroup?.name ?? 'Week 1');
    const x2Label = clean(payload.data.week2Ext?.tournamentGroup?.name ?? 'Week 2');

    // Prepare per-series values for both weeks
    const raw = Array.from(grouped.entries()).map(([id, vals]) => {
      const w1 = vals.w1;
      const w2 = vals.w2;
      return {
        id,
        data: [
          { x: x1Label, y: w1 },
          { x: x2Label, y: w2 },
        ] as TwoWeekPoint[],
        sum: w1 + w2,
        w1,
        w2,
      };
    });

    // Compute top-X for each week and include union
    const topW1 = [...raw]
      .sort((a, b) => b.w1 - a.w1)
      .slice(0, metaPart === 'winners' ? raw.length : TOP_X)
      .filter(s => s.w1 > 0)
      .map(s => s.id);
    const topW2 = [...raw]
      .sort((a, b) => b.w2 - a.w2)
      .slice(0, metaPart === 'winners' ? raw.length : TOP_X)
      .filter(s => s.w2 > 0)
      .map(s => s.id);
    const includeIds = new Set<string>([...topW1, ...topW2]);

    // Filter series and sort by total descending for consistent stacking
    const filtered = raw.filter(s => includeIds.has(s.id)).sort((a, b) => b.sum - a.sum);

    // Create gradient defs and fill mappings
    const defs = filtered.map(item => colorDefsFactory(item.id, metaInfo));
    const fillDefs = filtered.map(item => ({ match: { id: item.id }, id: item.id }));

    // Strip helper fields
    const finalData = filtered.map(({ id, data }) => ({ id, data }));

    return { chartData: finalData, chartDefs: defs, fill: fillDefs };
  }, [
    payload.data.dataPoints,
    payload.data.week1Ext?.tournamentGroup?.name,
    payload.data.week2Ext?.tournamentGroup?.name,
    metaPart,
    metaView,
    cardListData,
    colorDefsFactory,
    metaInfo,
  ]);

  // Labels: only on the right side like WeekToWeek
  const endLabel = useMemo(() => {
    return (d: { id: string; data: Array<{ x: number; y: number }> }) => {
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

  // set default active deck to the top series when data changes
  useEffect(() => {
    if (chartData && chartData.length > 0) {
      setActiveDeckKey(prev => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ids = chartData.map((s: any) => s.id as string);
        if (prev && ids.includes(prev)) return prev;
        return chartData[0]?.id as string;
      });
    } else {
      setActiveDeckKey(null);
    }
  }, [chartData]);

  return (
    <div className="h-full w-full flex flex-col gap-2">
      <div className="flex gap-2 justify-between items-center border-b">
        <div className="flex items-center gap-2">
          <h4>Weekly change (last 2 weeks)</h4>
          <SectionInfoTooltip
            dailySnapshot={dailySnapshot}
            sectionUpdatedAt={sectionUpdatedAt}
            sectionDataWarning={true}
            tournamentGroupExtendedInfo={groups}
          >
            <div>This section compares meta share over last two weeks.</div>
            <div>
              Values in chart are sorted from the most played (on top) to less played.
              <ul className={'list-disc ml-4'}>
                <li>
                  <span className="font-bold">total / top 8</span> - compares meta share of {TOP_X}{' '}
                  most played leaders (+bases) from both weeks
                </li>
                <li>
                  <span className="font-bold">champions</span> - all winning leaders (+bases) are
                  included in the chart
                </li>
              </ul>
            </div>
            <div>
              In table, multiple leaders (+bases) can show the same placement (eg. 1st, 2nd, 3rd) in
              case they have the same count. In this case, the "best" shared placement is shown.
            </div>
            <div>
              Arrows in the table <ArrowCell p1={10} p2={1} /> <ArrowCell p1={1} p2={10} /> show
              change in placement and are not visible in case the placement did not change between
              weeks.
            </div>
          </SectionInfoTooltip>
        </div>
        <WeeklyChangeDropdownMenu />
      </div>
      <div className="flex gap-2 justify-start items-center">
        <MetaPartSelector value={metaPart} onChange={setMetaPart} />
        <div className="w-1 h-full border-r" />
        <MetaViewSelector value={metaView} onChange={setMetaView} />
      </div>

      <div className="w-full overflow-visible">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[250px] flex-[2] overflow-visible">
            <div className="h-[250px] w-full">
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available for weekly change
                </div>
              ) : (
                <ResponsiveAreaBump
                  data={chartData}
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
              )}
            </div>
            {chartData.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground flex justify-between px-1 w-full">
                <span className="truncate" title={x1LabelRender}>
                  {x1LabelRender}
                </span>
                <span className="truncate" title={x2LabelRender}>
                  {x2LabelRender}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-[230px] shrink-0 flex-1">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No selection
              </div>
            ) : activeDeckKey ? (
              <WeeklyChangeAreaBumpTooltip
                deckKey={activeDeckKey}
                metaInfo={metaInfo}
                payload={payload}
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
    </div>
  );
};

export default WeeklyChange;
