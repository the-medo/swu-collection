import * as React from 'react';
import { useMemo } from 'react';
import type { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import type {
  DailySnapshotSectionData,
  SectionWeeklyChange,
} from '../../../../../../types/DailySnapshots.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { getDeckKey2 } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';

const fixedKeys = ['unknown', 'others', ''];

export interface WeeklyChangeAreaBumpTooltipProps {
  deckKey: string;
  metaInfo: MetaInfo; // derived from metaView in parent ('leaders' | 'leadersAndBase')
  payload: DailySnapshotSectionData<SectionWeeklyChange>;
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

const WeeklyChangeAreaBumpTooltip: React.FC<WeeklyChangeAreaBumpTooltipProps> = ({
  deckKey,
  metaInfo,
  payload,
  labelRenderer,
}) => {
  const { data: cardListData } = useCardList();

  // Resolve week labels from tournament groups, removing the word "Weekend"
  const weekLabels = useMemo(() => {
    const w1Name = stripWeekend(payload.data.week1Ext?.tournamentGroup?.name) || 'Week 1';
    const w2Name = stripWeekend(payload.data.week2Ext?.tournamentGroup?.name) || 'Week 2';
    return { w1Name, w2Name } as const;
  }, [payload.data.week1Ext, payload.data.week2Ext]);

  // Build grouped data identical to the chart's keying strategy
  const grouped = useMemo(() => {
    type Acc = {
      id: string;
      week1: { total: number; top8: number; champions: number };
      week2: { total: number; top8: number; champions: number };
    };

    const map = new Map<string, Acc>();

    payload.data.dataPoints.forEach(dp => {
      if (fixedKeys.includes(dp.leaderCardId)) return;
      const key =
        metaInfo === 'leaders'
          ? dp.leaderCardId
          : getDeckKey2(dp.leaderCardId, dp.baseCardId, 'leadersAndBase', cardListData);

      const acc = map.get(key) || {
        id: key,
        week1: { total: 0, top8: 0, champions: 0 },
        week2: { total: 0, top8: 0, champions: 0 },
      };

      acc.week1.total += dp.week1.total ?? 0;
      acc.week1.top8 += dp.week1.top8 ?? 0;
      acc.week1.champions += dp.week1.champions ?? 0;

      acc.week2.total += dp.week2.total ?? 0;
      acc.week2.top8 += dp.week2.top8 ?? 0;
      acc.week2.champions += dp.week2.champions ?? 0;

      map.set(key, acc);
    });

    return Array.from(map.values());
  }, [payload.data.dataPoints, metaInfo, cardListData]);

  console.log({ grouped });

  // Compute placements for each metric and week
  const placements = useMemo(() => {
    // Helper to rank by metric and pick placement for a given id
    const rankFor = (
      metric: 'total' | 'top8' | 'champions',
      week: 'week1' | 'week2',
    ): Record<string, number> => {
      const sorted = [...grouped]
        .sort((a, b) => (b[week][metric] || 0) - (a[week][metric] || 0))
        .filter(item => item[week][metric] > 0);
      const pos: Record<string, number> = {};
      // Competition ranking (1,2,2,2,5,5,7): equal values share the same rank,
      // and subsequent ranks skip by the number of ties.
      let prevVal: number | null = null;
      let prevRank = 0;
      sorted.forEach((item, idx) => {
        const val = item[week][metric] || 0;
        if (prevVal !== null && val === prevVal) {
          // Tie with previous value: keep the same rank
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
  }, [grouped]);

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

  const Cell: React.FC<{ v: number; place: number | null }> = ({ v, place }) => (
    <div className="flex items-center justify-end gap-1">
      <span className="font-semibold tabular-nums text-sm">{v}</span>
      {place ? (
        <span className="inline-flex items-center rounded-full bg-muted px-1 py-[1px] text-[9px] font-medium text-muted-foreground">
          {toOrdinal(place)}
        </span>
      ) : null}
    </div>
  );

  const ArrowCell: React.FC<{ p1: number | null; p2: number | null }> = ({ p1, p2 }) => {
    if (typeof p1 !== 'number' || typeof p2 !== 'number') return null;
    if (p2 < p1) {
      return (
        <span className="text-emerald-500" title="Improved placement">
          ▲
        </span>
      );
    }
    if (p2 > p1) {
      return (
        <span className="text-red-500" title="Worse placement">
          ▼
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-card p-1 xrounded-md xshadow-md xborder">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 font-medium">
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
                <td className="pl-0 pr-1 py-1">Champions</td>
                <td className="pr-1 py-1">
                  <Cell v={w1.champions} place={p1.champions} />
                </td>
                <td className="text-center py-1">
                  <ArrowCell p1={p1.champions} p2={p2.champions} />
                </td>
                <td className="py-1">
                  <Cell v={w2.champions} place={p2.champions} />
                </td>
              </tr>
              <tr>
                <td className="pl-0 pr-1 py-1">Top 8</td>
                <td className="pr-1 py-1">
                  <Cell v={w1.top8} place={p1.top8} />
                </td>
                <td className="text-center py-1">
                  <ArrowCell p1={p1.top8} p2={p2.top8} />
                </td>
                <td className="py-1">
                  <Cell v={w2.top8} place={p2.top8} />
                </td>
              </tr>
              <tr>
                <td className="pl-0 pr-1 py-1">Total</td>
                <td className="pr-1 py-1">
                  <Cell v={w1.total} place={p1.total} />
                </td>
                <td className="text-center py-1">
                  <ArrowCell p1={p1.total} p2={p2.total} />
                </td>
                <td className="py-1">
                  <Cell v={w2.total} place={p2.total} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WeeklyChangeAreaBumpTooltip;
