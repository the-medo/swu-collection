import { db } from '../../../db';
import { tournamentGroupLeaderBase } from '../../../db/schema/tournament_group_leader_base.ts';
import { eq } from 'drizzle-orm';
import {
  type DailySnapshotSectionData,
  type SectionMetaShare2Weeks,
  type SectionMetaShare2WeeksDataPoint,
  type TournamentGroupExtendedInfo,
} from '../../../../types/DailySnapshots.ts';
import { getDeckKey2 } from '../../../../frontend/src/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';

export const buildMetaShare2WeeksSection = async (
  groupExt?: TournamentGroupExtendedInfo | null,
): Promise<DailySnapshotSectionData<SectionMetaShare2Weeks>> => {
  const tournamentGroupId = groupExt?.tournamentGroup.id ?? null;
  // If no group id provided, return empty structure
  if (!tournamentGroupId) {
    const empty: SectionMetaShare2Weeks = {
      dataPoints: [],
      tournamentGroupExt: groupExt ?? null,
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
    r.leaderCardId ? `${r.leaderCardId}:${r.baseCardId}` : 'unknown';
  const includedKeys = new Set<string>();
  const includedLeaderKeys = new Set<string>();

  rows.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

  rows.forEach((r, i) => {
    if (
      (r.winners > 0 || r.top8 > 0 || i < 10) &&
      r.leaderCardId !== 'unknown' &&
      r.leaderCardId !== 'others'
    ) {
      includedKeys.add(keyOf(r));
      includedLeaderKeys.add(r.leaderCardId);
    }
  });
  rows.forEach((r, i) => {
    if (!includedKeys.has(keyOf(r) && includedLeaderKeys.has(r.leaderCardId))) {
      includedKeys.add(keyOf(r));
      includedLeaderKeys.add(r.leaderCardId);
    }
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
  const restRows = rows.filter(r => r.leaderCardId === 'others');
  const unknownRows = rows.filter(r => r.leaderCardId === 'unknown');

  const rest: SectionMetaShare2WeeksDataPoint | null = restRows.length
    ? {
        leaderCardId: 'others',
        baseCardId: '',
        total: restRows.reduce((acc, r) => acc + (r.total ?? 0), 0),
        top8: 0, // all rows with `top8` are already in includedKeys
        winners: 0, // all rows with `winners` are already in includedKeys
      }
    : null;

  const unknown: SectionMetaShare2WeeksDataPoint | null = unknownRows.length
    ? {
        leaderCardId: 'unknown',
        baseCardId: '',
        total: unknownRows.reduce((acc, r) => acc + (r.total ?? 0), 0),
        top8: unknownRows.reduce((acc, r) => acc + (r.top8 ?? 0), 0),
        winners: unknownRows.reduce((acc, r) => acc + (r.winners ?? 0), 0),
      }
    : null;

  console.log(rest, unknown);

  const dataPoints = detailed;
  if (rest) dataPoints.push(rest);
  if (unknown) dataPoints.push(unknown);

  const data: SectionMetaShare2Weeks = {
    dataPoints,
    tournamentGroupExt: groupExt ?? null,
  };

  return {
    id: 'meta-share-2-weeks',
    title: 'Meta Share (2 Weeks)',
    data,
  };
};

export default buildMetaShare2WeeksSection;
