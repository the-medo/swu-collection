import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { cardList } from '../../../db/lists.ts';
import { tournamentGroupLeaderBase } from '../../../db/schema/tournament_group_leader_base.ts';
import type {
  DailySnapshotSectionData,
  SectionBaseDistribution,
  TournamentGroupExtendedInfo,
} from '../../../../types/DailySnapshots.ts';
import { countBaseDistribution } from './base-distribution-counts.ts';

export default async function buildBaseDistributionSection(
  groupExt: TournamentGroupExtendedInfo | null,
): Promise<DailySnapshotSectionData<SectionBaseDistribution>> {
  const rows = groupExt
    ? await db
        .select({
          leaderCardId: tournamentGroupLeaderBase.leaderCardId,
          baseCardId: tournamentGroupLeaderBase.baseCardId,
          total: tournamentGroupLeaderBase.total,
          top8: tournamentGroupLeaderBase.top8,
          winner: tournamentGroupLeaderBase.winner,
        })
        .from(tournamentGroupLeaderBase)
        .where(eq(tournamentGroupLeaderBase.tournamentGroupId, groupExt.tournamentGroup.id))
    : [];

  return {
    id: 'base-distribution',
    title: 'Base distribution',
    data: {
      twoWeeks: countBaseDistribution(rows, cardList),
      twoWeeksGroupExt: groupExt,
    },
  };
}
