import { db } from '../../../db';
import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import { tournament } from '../../../db/schema/tournament.ts';
import { tournamentGroupTournament } from '../../../db/schema/tournament_group_tournament.ts';
import { isWeekend } from 'date-fns';
import {
  type DailySnapshotSectionData,
  type SectionUpcomingTournaments,
} from '../../../../types/DailySnapshots.ts';

export const buildUpcomingTournamentsSection = async (
  upcomingWeekTournamentGroupId?: string | null,
): Promise<DailySnapshotSectionData<SectionUpcomingTournaments>> => {
  const weekendNow = isWeekend(new Date());
  const title = weekendNow ? 'Current weekend' : 'Upcoming weekend';

  // If no group id, return empty payload to keep contract stable
  if (!upcomingWeekTournamentGroupId) {
    const empty: SectionUpcomingTournaments = {
      tournamentGroupId: '',
      dataPoints: [],
    };
    return { id: 'upcoming-tournaments', title, data: empty };
  }

  const tournamentColumns = getTableColumns(tournament);

  // Get all tournaments linked to the provided weekend group (no imported filter)
  const rows = await db
    .select({
      ...tournamentColumns,
    })
    .from(tournament)
    .innerJoin(
      tournamentGroupTournament,
      eq(tournamentGroupTournament.tournamentId, tournament.id),
    )
    .where(eq(tournamentGroupTournament.groupId, upcomingWeekTournamentGroupId))
    .orderBy(asc(tournament.date));

  const dataPoints = rows.map(t => ({
    id: t.id,
    userId: t.userId,
    type: t.type,
    location: t.location,
    continent: t.continent,
    name: t.name,
    meta: t.meta ?? 0,
    attendance: t.attendance,
    meleeId: t.meleeId ?? null,
    format: t.format,
    days: t.days,
    dayTwoPlayerCount: t.dayTwoPlayerCount ?? null,
    date: (t.date as unknown as Date).toISOString().slice(0, 10),
    createdAt: (t.createdAt as Date).toISOString(),
    updatedAt: (t.updatedAt as Date).toISOString(),
    imported: t.imported,
    bracketInfo: t.bracketInfo ?? undefined,
  }));

  const data: SectionUpcomingTournaments = {
    tournamentGroupId: upcomingWeekTournamentGroupId,
    dataPoints,
  };

  return { id: 'upcoming-tournaments', title, data };
};

export default buildUpcomingTournamentsSection;
