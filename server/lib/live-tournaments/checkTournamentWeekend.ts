import { and, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import {
  tournamentWeekend,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { liveTournamentCheck } from './liveTournamentCheck.ts';
import type { LiveTournamentCheckResult } from './types.ts';

export async function checkTournamentWeekend(weekendId: string) {
  const weekend = (
    await db
      .select({ id: tournamentWeekend.id })
      .from(tournamentWeekend)
      .where(eq(tournamentWeekend.id, weekendId))
      .limit(1)
  )[0];

  if (!weekend) {
    return null;
  }

  const eligibleTournaments = await db
    .select({
      tournamentId: tournamentWeekendTournament.tournamentId,
      meleeId: tournamentTable.meleeId,
      status: tournamentWeekendTournament.status,
    })
    .from(tournamentWeekendTournament)
    .innerJoin(tournamentTable, eq(tournamentWeekendTournament.tournamentId, tournamentTable.id))
    .where(
      and(
        eq(tournamentWeekendTournament.tournamentWeekendId, weekendId),
        ne(tournamentWeekendTournament.status, 'finished'),
        isNotNull(tournamentTable.meleeId),
        sql`${tournamentTable.meleeId} <> ''`,
      ),
    );

  const results: LiveTournamentCheckResult[] = [];
  for (const eligibleTournament of eligibleTournaments) {
    results.push(
      await liveTournamentCheck({
        weekendId,
        tournamentId: eligibleTournament.tournamentId,
      }),
    );
  }

  return {
    eligibleTournamentCount: eligibleTournaments.length,
    eligibleTournaments,
    results,
  };
}
