import { db } from '../../../db';
import { asc, eq, getTableColumns, gte, lte, inArray, and } from 'drizzle-orm';
import { tournament } from '../../../db/schema/tournament.ts';
import { tournamentGroupTournament } from '../../../db/schema/tournament_group_tournament.ts';
import { addDays, isWeekend } from 'date-fns';
import {
  type DailySnapshotSectionData,
  type SectionUpcomingTournaments,
  type TournamentGroupExtendedInfo,
} from '../../../../types/DailySnapshots.ts';

export const buildUpcomingTournamentsSection = async (
  groupExt?: TournamentGroupExtendedInfo | null,
): Promise<DailySnapshotSectionData<SectionUpcomingTournaments>> => {
  const weekendNow = isWeekend(new Date());
  const title = weekendNow ? 'Current weekend' : 'Upcoming weekend';

  const tournamentGroupId = groupExt?.tournamentGroup.id ?? null;
  // If no group id, return empty payload to keep contract stable
  if (!tournamentGroupId) {
    const empty: SectionUpcomingTournaments = {
      tournamentGroupId: '',
      dataPoints: [],
      tournamentGroupExt: groupExt ?? null,
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
    .innerJoin(tournamentGroupTournament, eq(tournamentGroupTournament.tournamentId, tournament.id))
    .where(eq(tournamentGroupTournament.groupId, tournamentGroupId))
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

  // Compute upcoming major tournaments (SQ/RQ/GC) for the next 20 days
  const now = new Date();
  const in20 = addDays(now, 20);
  const majorTypes: string[] = ['sq', 'rq', 'gc'];

  const tournamentColumns2 = getTableColumns(tournament);
  const upcomingMajorsRows = await db
    .select({
      ...tournamentColumns2,
    })
    .from(tournament)
    .where(
      and(
        inArray(tournament.type, majorTypes),
        gte(tournament.date, now),
        lte(tournament.date, in20),
      ),
    )
    .orderBy(asc(tournament.date), asc(tournament.updatedAt));

  const upcomingMajorTournaments = upcomingMajorsRows.map(t => ({
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
    tournamentGroupId,
    dataPoints,
    upcomingMajorTournaments,
    tournamentGroupExt: groupExt ?? null,
  };

  return { id: 'upcoming-tournaments', title, data };
};

export default buildUpcomingTournamentsSection;
