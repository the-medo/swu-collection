import { cn } from '@/lib/utils.ts';
import * as React from 'react';
import { useMemo, useState } from 'react';
import type { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import type {
  DailySnapshotSectionData,
  SectionWeeklyChange,
} from '../../../../../../../types/DailySnapshots.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import type { WeeklyChangeStats } from './weeklyChangeData.ts';
import { ArrowCell } from '@/components/app/daily-snapshots/sections/WeeklyChange/ArrowCell.tsx';

export interface WeeklyChangeAreaBumpTooltipProps {
  deckKey: string;
  metaInfo: MetaInfo; // derived from metaView in parent ('leaders' | 'leadersAndBase')
  payload: DailySnapshotSectionData<SectionWeeklyChange>;
  stats: WeeklyChangeStats;
  labelRenderer: ReturnType<typeof useLabel>;
}

// Format 1st/2nd/3rd/4th ...
const toOrdinal = (n: number | null | undefined): string => {
  if (!n || n < 1) return '';
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};

const stripWeekend = (name?: string | null): string | undefined => {
  if (!name) return undefined;
  return name.replace(/Weekend/gi, '').trim();
};

const formatPct = (n: number) => `${n.toFixed(1)}%`;

const Cell: React.FC<{ v: number; place: number | null; isPercent?: boolean }> = ({
  v,
  place,
  isPercent,
}) => (
  <div className="flex items-center justify-end gap-1">
    <span className="font-semibold tabular-nums text-sm">{isPercent ? formatPct(v) : v}</span>
    {place ? (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-muted px-1 py-px text-[9px] font-medium',
          'text-muted-foreground',
        )}
      >
        {toOrdinal(place)}
      </span>
    ) : null}
  </div>
);

const WeeklyChangeAreaBumpTooltip: React.FC<WeeklyChangeAreaBumpTooltipProps> = ({
  deckKey,
  metaInfo,
  payload,
  stats,
  labelRenderer,
}) => {
  const [showCounts, setShowCounts] = useState(false); // default to percentages

  // Resolve week labels from tournament groups, removing the word "Weekend"
  const weekLabels = useMemo(() => {
    const w1Name = stripWeekend(payload.data.week1Ext?.tournamentGroup?.name) || 'Week 1';
    const w2Name = stripWeekend(payload.data.week2Ext?.tournamentGroup?.name) || 'Week 2';
    return { w1Name, w2Name } as const;
  }, [payload.data.week1Ext, payload.data.week2Ext]);

  // Share the complete grouped field and denominators with the chart.
  const { grouped, totals } = stats;

  // Compute placements for each metric and week, using percentages
  const placements = useMemo(() => {
    const percentFor = (value: number, denom: number) => (denom > 0 ? (value / denom) * 100 : 0);

    // Helper to rank by percentage metric and pick placement for a given id
    const rankFor = (
      metric: 'total' | 'top8' | 'champions',
      week: 'week1' | 'week2',
    ): Record<string, number> => {
      const denom = totals[week][metric] || 0;
      const sorted = [...grouped]
        .map(item => ({ id: item.id, pct: percentFor(item[week][metric] || 0, denom) }))
        .sort((a, b) => (b.pct || 0) - (a.pct || 0))
        .filter(item => item.pct > 0);
      const pos: Record<string, number> = {};
      // Competition ranking (1,2,2,2,5,...)
      let prevVal: number | null = null;
      let prevRank = 0;
      sorted.forEach((item, idx) => {
        const val = item.pct || 0;
        if (prevVal !== null && val === prevVal) {
          pos[item.id] = prevRank;
        } else {
          const rank = idx + 1;
          pos[item.id] = rank;
          prevRank = rank;
          prevVal = val;
        }
      });
      return pos;
    };

    return {
      week1: {
        total: rankFor('total', 'week1'),
        top8: rankFor('top8', 'week1'),
        champions: rankFor('champions', 'week1'),
      },
      week2: {
        total: rankFor('total', 'week2'),
        top8: rankFor('top8', 'week2'),
        champions: rankFor('champions', 'week2'),
      },
    } as const;
  }, [grouped, totals]);

  const row = grouped.find(x => x.id === deckKey);

  const w1 = row?.week1 ?? { total: 0, top8: 0, champions: 0 };
  const w2 = row?.week2 ?? { total: 0, top8: 0, champions: 0 };

  const p1 = {
    total: placements.week1.total[deckKey] ?? null,
    top8: placements.week1.top8[deckKey] ?? null,
    champions: placements.week1.champions[deckKey] ?? null,
  };
  const p2 = {
    total: placements.week2.total[deckKey] ?? null,
    top8: placements.week2.top8[deckKey] ?? null,
    champions: placements.week2.champions[deckKey] ?? null,
  };

  // Values to display based on toggle
  const w1Pct = {
    champions: totals.week1.champions > 0 ? (w1.champions / totals.week1.champions) * 100 : 0,
    top8: totals.week1.top8 > 0 ? (w1.top8 / totals.week1.top8) * 100 : 0,
    total: totals.week1.total > 0 ? (w1.total / totals.week1.total) * 100 : 0,
  };
  const w2Pct = {
    champions: totals.week2.champions > 0 ? (w2.champions / totals.week2.champions) * 100 : 0,
    top8: totals.week2.top8 > 0 ? (w2.top8 / totals.week2.top8) * 100 : 0,
    total: totals.week2.total > 0 ? (w2.total / totals.week2.total) * 100 : 0,
  };

  const showAsPercent = !showCounts;

  return (
    <div
      className={cn(
        'meta-weekly-detail p-3 border border-[color:var(--meta-line)] rounded-[14px] bg-[var(--meta-tint)]',
        '[&_th]:font-medium',
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="w-full flex items-center justify-center gap-2 font-medium">
          {labelRenderer(deckKey, metaInfo, 'image-small')}
        </div>
        <div className="text-xs">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-muted-foreground">
                <th className="text-left py-1 pl-0 pr-1">&nbsp;</th>
                <th className="text-right py-1 px-1 bg-muted/30 rounded-sm">{weekLabels.w1Name}</th>
                <th className="w-4 text-center py-1">&nbsp;</th>
                <th className="text-right py-1 px-1 bg-muted/30 rounded-sm">{weekLabels.w2Name}</th>
              </tr>
            </thead>
            <tbody className="[&_tr+tr]:border-t [&_tr+tr]:border-muted-foreground/20">
              <tr>
                <td className="pl-0 pr-1 py-1">Total</td>
                <td className="pr-1 py-1">
                  <Cell
                    v={showAsPercent ? w1Pct.total : w1.total}
                    place={p1.total}
                    isPercent={showAsPercent}
                  />
                </td>
                <td className="text-center py-1">
                  <ArrowCell p1={p1.total} p2={p2.total} />
                </td>
                <td className="py-1">
                  <Cell
                    v={showAsPercent ? w2Pct.total : w2.total}
                    place={p2.total}
                    isPercent={showAsPercent}
                  />
                </td>
              </tr>
              <tr>
                <td className="pl-0 pr-1 py-1">Top 8</td>
                <td className="pr-1 py-1">
                  <Cell
                    v={showAsPercent ? w1Pct.top8 : w1.top8}
                    place={p1.top8}
                    isPercent={showAsPercent}
                  />
                </td>
                <td className="text-center py-1">
                  <ArrowCell p1={p1.top8} p2={p2.top8} />
                </td>
                <td className="py-1">
                  <Cell
                    v={showAsPercent ? w2Pct.top8 : w2.top8}
                    place={p2.top8}
                    isPercent={showAsPercent}
                  />
                </td>
              </tr>
              <tr>
                <td className="pl-0 pr-1 py-1">Champions</td>
                <td className="pr-1 py-1">
                  <Cell
                    v={showAsPercent ? w1Pct.champions : w1.champions}
                    place={p1.champions}
                    isPercent={showAsPercent}
                  />
                </td>
                <td className="text-center py-1">
                  <ArrowCell p1={p1.champions} p2={p2.champions} />
                </td>
                <td className="py-1">
                  <Cell
                    v={showAsPercent ? w2Pct.champions : w2.champions}
                    place={p2.champions}
                    isPercent={showAsPercent}
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-1">
            <button
              type="button"
              className={cn(
                'text-[11px] text-muted-foreground',
                'hover:text-foreground',
                'underline',
              )}
              onClick={() => setShowCounts(prev => !prev)}
            >
              {showAsPercent ? 'Display counts' : 'Display percentages'}
            </button>
            {!showAsPercent ? (
              <div className="text-[10px] text-muted-foreground mt-1">
                Note: Counts can be misleading when the number or size of tournaments differs
                between weeks.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyChangeAreaBumpTooltip;
