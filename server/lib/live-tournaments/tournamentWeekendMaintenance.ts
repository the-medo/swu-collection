import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { addDays, format, isSaturday, isValid, parseISO } from 'date-fns';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import {
  tournamentWeekend,
  tournamentWeekendTournament,
  tournamentWeekendTournamentStatusEnum,
} from '../../db/schema/tournament_weekend.ts';

export const zSaturdayDateMessage = 'Date must be a Saturday in YYYY-MM-DD format.';
const dateStringFormat = 'yyyy-MM-dd';

export function isSaturdayDateString(value: string) {
  const date = new Date(value);

  return date !== null && isSaturday(date);
}

function addDaysToDateString(value: string, days: number) {
  const date = new Date(value);

  if (!date) {
    throw new Error(`Invalid date string: ${value}`);
  }

  return format(addDays(date, days), dateStringFormat);
}

export function getTournamentWeekendWindow(saturdayDate: string) {
  return {
    startDate: saturdayDate,
    endDate: addDaysToDateString(saturdayDate, 1),
  };
}

async function findOverlappingTournamentIds(saturdayDate: string) {
  const { startDate, endDate } = getTournamentWeekendWindow(saturdayDate);

  const rows = await db
    .select({ id: tournamentTable.id })
    .from(tournamentTable)
    .where(
      sql`${tournamentTable.date} <= ${endDate}::date
        AND (${tournamentTable.date} + (${tournamentTable.days} - 1)) >= ${startDate}::date`,
    );

  return rows.map(row => row.id);
}

export async function syncTournamentWeekendTournaments(weekendId: string, saturdayDate: string) {
  const tournamentIds = await findOverlappingTournamentIds(saturdayDate);

  const existingRows = await db
    .select({ tournamentId: tournamentWeekendTournament.tournamentId })
    .from(tournamentWeekendTournament)
    .where(eq(tournamentWeekendTournament.tournamentWeekendId, weekendId));

  const existingIds = new Set(existingRows.map(row => row.tournamentId));
  const nextIds = new Set(tournamentIds);

  const missingIds = tournamentIds.filter(id => !existingIds.has(id));
  const extraneousIds = existingRows.map(row => row.tournamentId).filter(id => !nextIds.has(id));

  if (missingIds.length > 0) {
    await db
      .insert(tournamentWeekendTournament)
      .values(
        missingIds.map(tournamentId => ({
          tournamentWeekendId: weekendId,
          tournamentId,
          status: 'unknown' as const,
        })),
      )
      .onConflictDoNothing();
  }

  if (extraneousIds.length > 0) {
    await db
      .delete(tournamentWeekendTournament)
      .where(
        and(
          eq(tournamentWeekendTournament.tournamentWeekendId, weekendId),
          inArray(tournamentWeekendTournament.tournamentId, extraneousIds),
        ),
      );
  }

  await recomputeTournamentWeekendCounters(weekendId);

  return {
    tournamentIds,
    inserted: missingIds.length,
    deleted: extraneousIds.length,
    total: tournamentIds.length,
  };
}

export async function recomputeTournamentWeekendCounters(weekendId: string) {
  const statuses = tournamentWeekendTournamentStatusEnum.enumValues;
  const counts = await db
    .select({
      status: tournamentWeekendTournament.status,
      count: count(),
    })
    .from(tournamentWeekendTournament)
    .where(eq(tournamentWeekendTournament.tournamentWeekendId, weekendId))
    .groupBy(tournamentWeekendTournament.status);

  const countMap = new Map(counts.map(row => [row.status, row.count]));

  await db
    .update(tournamentWeekend)
    .set({
      tournamentsUpcoming: countMap.get('upcoming') ?? 0,
      tournamentsRunning: countMap.get('running') ?? 0,
      tournamentsFinished: countMap.get('finished') ?? 0,
      tournamentsUnknown: countMap.get('unknown') ?? 0,
      updatedAt: sql`NOW()`,
    })
    .where(eq(tournamentWeekend.id, weekendId));

  return Object.fromEntries(statuses.map(status => [status, countMap.get(status) ?? 0]));
}
