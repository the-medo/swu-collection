import { db } from '../../../db';
import { asc, eq, getTableColumns, gte, lte, inArray, and } from 'drizzle-orm';
import { tournament } from '../../../db/schema/tournament.ts';
import { tournamentGroupTournament } from '../../../db/schema/tournament_group_tournament.ts';
import { tournamentType as tournamentTypeTable } from '../../../db/schema/tournament_type.ts';
import { addDays, format as formatDate, isWeekend, startOfWeek } from 'date-fns';
import {
  type DailySnapshotSectionData,
  type SectionUpcomingTournaments,
  type TournamentGroupExtendedInfo,
} from '../../../../types/DailySnapshots.ts';
import { dailySnapshotFeaturedTournamentTypes } from '../../../../types/Tournament.ts';
import { dailySnapshotAdditionalFormatIds } from '../../../../types/Format.ts';

export const buildUpcomingTournamentsSection = async (
  groupExt?: TournamentGroupExtendedInfo | null,
  dateInput?: Date | string,
): Promise<DailySnapshotSectionData<SectionUpcomingTournaments>> => {
  const now = dateInput
    ? typeof dateInput === 'string'
      ? new Date(dateInput)
      : dateInput
    : new Date();
  const weekendNow = isWeekend(now);
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
  const premierRows = await db
    .select({
      ...tournamentColumns,
    })
    .from(tournament)
    .innerJoin(tournamentGroupTournament, eq(tournamentGroupTournament.tournamentId, tournament.id))
    .where(eq(tournamentGroupTournament.groupId, tournamentGroupId))
    .orderBy(asc(tournament.date));

  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekendStart = addDays(currentWeekStart, 5);
  const weekendEnd = addDays(weekendStart, 1);
  const weekendStartDate = new Date(formatDate(weekendStart, 'yyyy-MM-dd'));
  const weekendEndDate = new Date(formatDate(weekendEnd, 'yyyy-MM-dd'));

  // Eternal and limited majors are appended only to this display payload. They are not added to
  // the Premier tournament group used by the statistical snapshot sections.
  const additionalFormatRows = await db
    .select({ ...tournamentColumns })
    .from(tournament)
    .innerJoin(tournamentTypeTable, eq(tournament.type, tournamentTypeTable.id))
    .where(
      and(
        eq(tournamentTypeTable.major, 1),
        inArray(tournament.format, dailySnapshotAdditionalFormatIds),
        gte(tournament.date, weekendStartDate),
        lte(tournament.date, weekendEndDate),
      ),
    )
    .orderBy(asc(tournament.date));

  const rows = [
    ...new Map([...premierRows, ...additionalFormatRows].map(t => [t.id, t] as const)).values(),
  ];

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

  // Compute upcoming featured tournaments for the next 30 days
  const snapshotDate = new Date(formatDate(now, 'yyyy-MM-dd'));
  const in30 = addDays(snapshotDate, 30);
  const majorTypes: string[] = [...dailySnapshotFeaturedTournamentTypes];

  const tournamentColumns2 = getTableColumns(tournament);
  const upcomingMajorsRows = await db
    .select({
      ...tournamentColumns2,
    })
    .from(tournament)
    .where(
      and(
        inArray(tournament.type, majorTypes),
        gte(tournament.date, snapshotDate),
        lte(tournament.date, in30),
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
