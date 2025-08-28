import { db } from '../../../db';
import { tournamentGroupLeaderBase } from '../../../db/schema/tournament_group_leader_base.ts';
import { eq } from 'drizzle-orm';
import {
  type DailySnapshotSectionData,
  type SectionWeeklyChange,
  type SectionWeeklyChangeDataPoint,
  type TournamentGroupExtendedInfo,
} from '../../../../types/DailySnapshots.ts';

const keyOf = (r: { leaderCardId: string; baseCardId: string }) =>
  `${r.leaderCardId}|${r.baseCardId}`;

export const buildWeeklyChangeSection = async (
  week1Ext?: TournamentGroupExtendedInfo | null,
  week2Ext?: TournamentGroupExtendedInfo | null,
): Promise<DailySnapshotSectionData<SectionWeeklyChange>> => {
  const week1GroupId = week1Ext?.tournamentGroup.id ?? null;
  const week2GroupId = week2Ext?.tournamentGroup.id ?? null;
  // If either group id is missing, return empty structure to keep contract stable
  if (!week1GroupId || !week2GroupId) {
    const empty: SectionWeeklyChange = {
      week1Ext: week1Ext ?? null,
      week2Ext: week2Ext ?? null,
      dataPoints: [],
    };
    return { id: 'weekly-change', title: 'Weekly Change', data: empty };
  }

  // 1) Load rows for both weeks
  const rowsWeek1 = await db
    .select({
      leaderCardId: tournamentGroupLeaderBase.leaderCardId,
      baseCardId: tournamentGroupLeaderBase.baseCardId,
      winners: tournamentGroupLeaderBase.winner,
      top8: tournamentGroupLeaderBase.top8,
      total: tournamentGroupLeaderBase.total,
    })
    .from(tournamentGroupLeaderBase)
    .where(eq(tournamentGroupLeaderBase.tournamentGroupId, week1GroupId));

  const rowsWeek2 = await db
    .select({
      leaderCardId: tournamentGroupLeaderBase.leaderCardId,
      baseCardId: tournamentGroupLeaderBase.baseCardId,
      winners: tournamentGroupLeaderBase.winner,
      top8: tournamentGroupLeaderBase.top8,
      total: tournamentGroupLeaderBase.total,
    })
    .from(tournamentGroupLeaderBase)
    .where(eq(tournamentGroupLeaderBase.tournamentGroupId, week2GroupId));

  // 2) Build maps for quick lookup
  const map1 = new Map<
    string,
    { leaderCardId: string; baseCardId: string; total: number; top8: number }
  >();
  rowsWeek1.forEach(r =>
    map1.set(keyOf(r), {
      leaderCardId: r.leaderCardId,
      baseCardId: r.baseCardId,
      total: r.total ?? 0,
      top8: r.top8 ?? 0,
    }),
  );

  const map2 = new Map<
    string,
    { leaderCardId: string; baseCardId: string; total: number; top8: number }
  >();
  rowsWeek2.forEach(r =>
    map2.set(keyOf(r), {
      leaderCardId: r.leaderCardId,
      baseCardId: r.baseCardId,
      total: r.total ?? 0,
      top8: r.top8 ?? 0,
    }),
  );

  // 3) Determine inclusion set
  const allKeys = new Set<string>([...map1.keys(), ...map2.keys()]);

  // Top 10 by total for each week
  const top10Week1 = [...map1.values()]
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, 10)
    .map(r => keyOf(r));

  const top10Week2 = [...map2.values()]
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(0, 10)
    .map(r => keyOf(r));

  const included = new Set<string>();
  // Add top 8 appearances from either week and union of top10 by total from both weeks
  for (const k of allKeys) {
    const r1 = map1.get(k);
    const r2 = map2.get(k);
    if ((r1?.top8 ?? 0) > 0 || (r2?.top8 ?? 0) > 0) included.add(k);
  }
  top10Week1.forEach(k => included.add(k));
  top10Week2.forEach(k => included.add(k));

  // 4) Build detailed datapoints
  const detailed: SectionWeeklyChangeDataPoint[] = [...included].map(k => {
    const r1 = map1.get(k);
    const r2 = map2.get(k);
    const [leaderCardId, baseCardId] = (r1 ?? r2)!
      ? [r1?.leaderCardId ?? r2!.leaderCardId, r1?.baseCardId ?? r2!.baseCardId]
      : ['', ''];
    return {
      leaderCardId,
      baseCardId,
      week1: { total: r1?.total ?? 0, top8: r1?.top8 ?? 0 },
      week2: { total: r2?.total ?? 0, top8: r2?.top8 ?? 0 },
    };
  });

  // 5) Aggregate the rest
  let restWeek1Total = 0;
  let restWeek2Total = 0;

  for (const [k, r] of map1.entries()) {
    if (!included.has(k)) restWeek1Total += r.total ?? 0;
  }
  for (const [k, r] of map2.entries()) {
    if (!included.has(k)) restWeek2Total += r.total ?? 0;
  }

  const dataPoints: SectionWeeklyChangeDataPoint[] = [...detailed];
  if (restWeek1Total > 0 || restWeek2Total > 0) {
    dataPoints.push({
      leaderCardId: '',
      baseCardId: '',
      week1: { total: restWeek1Total, top8: 0 },
      week2: { total: restWeek2Total, top8: 0 },
    });
  }

  const data: SectionWeeklyChange = {
    week1Ext: week1Ext ?? null,
    week2Ext: week2Ext ?? null,
    dataPoints,
  };

  return {
    id: 'weekly-change',
    title: 'Weekly Change',
    data,
  };
};

export default buildWeeklyChangeSection;
