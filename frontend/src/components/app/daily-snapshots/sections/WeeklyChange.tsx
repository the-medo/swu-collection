import * as React from 'react';
import { useMemo, useState } from 'react';
import { ResponsiveAreaBump } from '@nivo/bump';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionWeeklyChange,
  TournamentGroupExtendedInfo,
} from '../../../../../../types/DailySnapshots.ts';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import type { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import MetaPartSelector, {
  type DailySnapshotMetaPart,
} from './MetaShareTwoWeeks/MetaPartSelector.tsx';
import MetaViewSelector, {
  type DailySnapshotMetaView,
} from './MetaShareTwoWeeks/MetaViewSelector.tsx';
import { SectionInfoTooltip } from './components/SectionInfoTooltip.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import {
  getDeckKey2,
  labelWidthBasedOnMetaInfo,
} from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import WeeklyChangeAreaBumpTooltip from '@/components/app/daily-snapshots/sections/WeeklyChangeAreaBumpTooltip.tsx';

export interface WeeklyChangeProps {
  payload: DailySnapshotSectionData<SectionWeeklyChange>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

// AreaBump datum type
interface TwoWeekPoint {
  x: number;
  y: number;
}

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

  // Build chart data from the payload (two x points: 1 for week1, 2 for week2)
  const { chartData, chartDefs, fill } = useMemo(() => {
    const TOP_X = 6; // keep similar to WeekToWeek chart

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

    // Prepare per-series values for both weeks
    const raw = Array.from(grouped.entries()).map(([id, vals]) => {
      const w1 = vals.w1;
      const w2 = vals.w2;
      return {
        id,
        data: [
          { x: 1, y: w1 },
          { x: 2, y: w2 },
        ] as TwoWeekPoint[],
        sum: w1 + w2,
        w1,
        w2,
      };
    });

    // Compute top-X for each week and include union
    const topW1 = [...raw]
      .sort((a, b) => b.w1 - a.w1)
      .slice(0, TOP_X)
      .filter(s => s.w1 > 0)
      .map(s => s.id);
    const topW2 = [...raw]
      .sort((a, b) => b.w2 - a.w2)
      .slice(0, TOP_X)
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
  }, [payload.data.dataPoints, colorDefsFactory, metaInfo, metaPart, metaView]);

  // Labels: only on the right side like WeekToWeek
  const endLabel = useMemo(() => {
    return (d: { id: string; data: Array<{ x: number; y: number }> }) => {
      const l = d.data?.length || 0;
      if (!l) return '';
      if (d.data[l - 1]?.y === 0) return '';
      return (labelRenderer(d.id as string, metaInfo, 'text') as string) ?? '';
    };
  }, [labelRenderer, metaInfo]);

  // label width based on metaInfo
  const labelWidth = labelWidthBasedOnMetaInfo[metaInfo] ?? 140;

  // Info tooltip tournament groups
  const groups: TournamentGroupExtendedInfo[] = [
    payload.data.week1Ext,
    payload.data.week2Ext,
  ].filter(Boolean) as TournamentGroupExtendedInfo[];

  // Narrow type issues for Nivo props locally only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartDataAny = chartData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartDefsAny = chartDefs as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fillAny = fill as any;

  console.log(chartDataAny);

  return (
    <div className="h-full w-full flex flex-col gap-2">
      <div className="flex gap-2 justify-between items-center">
        <div className="flex items-center gap-2">
          <h3>Weekly change (last 2 weeks)</h3>
          <SectionInfoTooltip
            dailySnapshot={dailySnapshot}
            sectionUpdatedAt={sectionUpdatedAt}
            tournamentGroupExtendedInfo={groups}
          >
            <div className="text-sm">
              This section compares the last two weeks. You can switch between Total decks, Top 8,
              and Champions, and choose how decks are grouped (by leader or leader+base).
            </div>
          </SectionInfoTooltip>
        </div>
      </div>
      <div className="flex gap-2 justify-start items-center">
        <MetaPartSelector value={metaPart} onChange={setMetaPart} />
        <div className="w-1 h-full border-r" />
        <MetaViewSelector value={metaView} onChange={setMetaView} />
      </div>

      <div className="w-full overflow-visible">
        <div className="h-[300px] min-w-[400px] border rounded-md p-2 overflow-visible">
          {chartDataAny.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available for weekly change
            </div>
          ) : (
            <ResponsiveAreaBump
              data={chartDataAny}
              margin={{ top: 30, right: labelWidth, bottom: 40, left: 20 }}
              spacing={4}
              colors={['#3B3B3B']}
              blendMode="normal"
              defs={chartDefsAny}
              fill={fillAny}
              axisTop={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Week',
                legendOffset: -20,
              }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Week',
                legendOffset: 32,
              }}
              startLabel={() => ''}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              endLabel={endLabel as any}
              endLabelTextColor={'hsl(var(--muted-foreground))'}
              tooltip={({ serie }) => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <WeeklyChangeAreaBumpTooltip
                  deckKey={serie.id as string}
                  metaInfo={metaInfo}
                  payload={payload}
                  labelRenderer={labelRenderer}
                />
              )}
            />
          )}
        </div>
      </div>

      <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
};

export default WeeklyChange;
