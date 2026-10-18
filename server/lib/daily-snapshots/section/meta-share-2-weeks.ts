import { db } from '../../../db';
import { tournamentGroupLeaderBase } from '../../../db/schema/tournament_group_leader_base.ts';
import { eq } from 'drizzle-orm';
import { buildMetaShareDataPoints } from './meta-share-data.ts';
import {
  type DailySnapshotSectionData,
  type SectionMetaShare2Weeks,
  type TournamentGroupExtendedInfo,
} from '../../../../types/DailySnapshots.ts';

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

  const dataPoints = buildMetaShareDataPoints(rows);

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
