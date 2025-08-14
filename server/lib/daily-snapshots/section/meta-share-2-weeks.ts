import { db } from '../../../db';
import { tournamentGroupLeaderBase } from '../../../db/schema/tournament_group_leader_base.ts';
import { tournamentGroupStats } from '../../../db/schema/tournament_group_stats.ts';
import { eq } from 'drizzle-orm';
import {
  type DailySnapshotSectionData,
  type SectionMetaShare2Weeks,
  type SectionMetaShare2WeeksDataPoint,
} from '../../../../types/DailySnapshots.ts';

export const buildMetaShare2WeeksSection = async (
  tournamentGroupId?: string | null,
): Promise<DailySnapshotSectionData<SectionMetaShare2Weeks>> => {
  // If no group id provided, return empty structure
  if (!tournamentGroupId) {
    const empty: SectionMetaShare2Weeks = {
      tournamentGroupId: '',
      tournamentsImported: 0,
      tournamentsTotal: 0,
      tournamentsAttendance: 0,
      dataPoints: [],
    };
    return { id: 'meta-share-2-weeks', title: 'Meta Share (2 Weeks)', data: empty };
  }

  // Load leader/base rows for the group
  const rows = await db
    .select({
      leaderCardId: tournamentGroupLeaderBase.leaderCardId,
      baseCardId: tournamentGroupLeaderBase.baseCardId,
      winners: tournamentGroupLeaderBase.winner,
      top8: tournamentGroupLeaderBase.top8,
      total: tournamentGroupLeaderBase.total,
    })
    .from(tournamentGroupLeaderBase)
    .where(eq(tournamentGroupLeaderBase.tournamentGroupId, tournamentGroupId));

  // Build inclusion sets
  const keyOf = (r: { leaderCardId: string; baseCardId: string }) =>
    `${r.leaderCardId}:${r.baseCardId}`;
  const includedKeys = new Set<string>();

  rows.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

  rows.forEach((r, i) => {
    if (r.winners > 0 || r.top8 > 0 || i < 10) includedKeys.add(keyOf(r));
  });

  // Prepare detailed datapoints for included rows
  const detailed: SectionMetaShare2WeeksDataPoint[] = rows
    .filter(r => includedKeys.has(keyOf(r)))
    .map(r => ({
      leaderCardId: r.leaderCardId,
      baseCardId: r.baseCardId,
      total: r.total ?? 0,
      top8: r.top8 ?? 0,
      winners: r.winners ?? 0,
    }));

  // 4) Aggregate the rest
  const restRows = rows.filter(r => !includedKeys.has(keyOf(r)));
  const rest: SectionMetaShare2WeeksDataPoint | null = restRows.length
    ? {
        leaderCardId: '',
        baseCardId: '',
        total: restRows.reduce((acc, r) => acc + (r.total ?? 0), 0),
        top8: 0, // all rows with `top8` are already in includedKeys
        winners: 0, // all rows with `winners` are already in includedKeys
      }
    : null;

  const dataPoints = rest ? [...detailed, rest] : detailed;

  // Compute tournaments attendance as sum of totals in final datapoints
  const tournamentsAttendance = dataPoints.reduce((acc, dp) => acc + (dp.total ?? 0), 0);

  // Load tournaments imported/total from tournament_group_stats
  const stats = (
    await db
      .select({
        importedTournaments: tournamentGroupStats.importedTournaments,
        totalTournaments: tournamentGroupStats.totalTournaments,
      })
      .from(tournamentGroupStats)
      .where(eq(tournamentGroupStats.tournamentGroupId, tournamentGroupId))
      .limit(1)
  )[0];

  const data: SectionMetaShare2Weeks = {
    tournamentGroupId,
    tournamentsImported: stats?.importedTournaments ?? 0,
    tournamentsTotal: stats?.totalTournaments ?? 0,
    tournamentsAttendance,
    dataPoints,
  };

  return {
    id: 'meta-share-2-weeks',
    title: 'Meta Share (2 Weeks)',
    data,
  };
};

export default buildMetaShare2WeeksSection;
