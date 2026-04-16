import { and, eq, isNotNull, ne, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import {
  tournamentWeekend,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { liveTournamentCheck } from './liveTournamentCheck.ts';
import { getLiveTournamentWeekend } from './tournamentWeekendMaintenance.ts';
import type { LiveTournamentCheckResult } from './types.ts';

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
};

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
        or(
          ne(tournamentWeekendTournament.status, 'finished'),
          eq(tournamentWeekendTournament.hasDecklists, false),
        ),
        isNotNull(tournamentTable.meleeId),
        sql`${tournamentTable.meleeId} <> ''`,
      ),
    );

  const results: LiveTournamentCheckResult[] = [];
  const errors: {
    tournamentId: string;
    meleeId: string | null;
    status: string;
    error: { message: string; stack?: string };
  }[] = [];

  for (const eligibleTournament of eligibleTournaments) {
    try {
      results.push(
        await liveTournamentCheck({
          weekendId,
          tournamentId: eligibleTournament.tournamentId,
        }),
      );
    } catch (error) {
      errors.push({
        tournamentId: eligibleTournament.tournamentId,
        meleeId: eligibleTournament.meleeId,
        status: eligibleTournament.status,
        error: serializeError(error),
      });
    }
  }

  return {
    eligibleTournamentCount: eligibleTournaments.length,
    eligibleTournaments,
    results,
    errors,
  };
}

export async function checkLiveTournamentWeekend() {
  const weekend = await getLiveTournamentWeekend();
  if (!weekend) return null;

  const result = await checkTournamentWeekend(weekend.id);
  if (!result) return null;

  return {
    weekend,
    ...result,
  };
}
