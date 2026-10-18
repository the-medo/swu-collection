import { db } from '../../../db';
import { tournamentGroupLeaderBase } from '../../../db/schema/tournament_group_leader_base.ts';
import { eq } from 'drizzle-orm';
import {
  type DailySnapshotSectionData,
  type SectionWeeklyChange,
  type TournamentGroupExtendedInfo,
} from '../../../../types/DailySnapshots.ts';

import { buildWeeklyChangeDataPoints } from './weekly-change-data.ts';

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

  const dataPoints = buildWeeklyChangeDataPoints(rowsWeek1, rowsWeek2);

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
