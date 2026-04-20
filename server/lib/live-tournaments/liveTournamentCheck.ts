import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import {
  tournamentImport,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { mergeLiveTournamentAdditionalData } from './additionalData.ts';
import { publishLiveTournamentChecked } from './liveTournamentEvents.ts';
import { liveTournamentProgressCheck } from './liveTournamentProgressCheck.ts';
import { fetchLiveTournamentDetailFromMelee } from './melee.ts';
import { tournamentExpectsMeleeDecklists } from './tournamentFormat.ts';
import { recomputeTournamentWeekendCounters } from './tournamentWeekendMaintenance.ts';
import type { LiveTournamentCheckInput, LiveTournamentCheckResult } from './types.ts';

const hasMissingProgressFields = (weekendTournament: {
  roundNumber: number | null;
  roundName: string | null;
  matchesTotal: number | null;
  matchesRemaining: number | null;
}) =>
  weekendTournament.roundNumber === null ||
  weekendTournament.roundName === null ||
  weekendTournament.matchesTotal === null ||
  weekendTournament.matchesRemaining === null;

export async function liveTournamentCheck(
  input: LiveTournamentCheckInput,
): Promise<LiveTournamentCheckResult> {
  const row = (
    await db
      .select({
        weekendTournament: tournamentWeekendTournament,
        tournament: tournamentTable,
      })
      .from(tournamentWeekendTournament)
      .innerJoin(tournamentTable, eq(tournamentWeekendTournament.tournamentId, tournamentTable.id))
      .where(
        and(
          eq(tournamentWeekendTournament.tournamentWeekendId, input.weekendId),
          eq(tournamentWeekendTournament.tournamentId, input.tournamentId),
        ),
      )
      .limit(1)
  )[0];

  if (!row) {
    return {
      type: 'skipped',
      weekendId: input.weekendId,
      tournamentId: input.tournamentId,
      reason: 'Tournament weekend row not found.',
    };
  }

  const meleeId = row.tournament.meleeId;
  if (!meleeId) {
    return {
      type: 'skipped',
      weekendId: input.weekendId,
      tournamentId: input.tournamentId,
      reason: 'Tournament has no Melee id.',
    };
  }

  const detail = await fetchLiveTournamentDetailFromMelee({
    meleeId,
    tournament: row.tournament,
  });
  const expectsDecklists = tournamentExpectsMeleeDecklists(row.tournament);
  const additionalData = mergeLiveTournamentAdditionalData(
    row.weekendTournament.additionalData,
    detail.additionalData,
  );

  if (detail.playerCount !== null) {
    await db
      .update(tournamentTable)
      .set({
        attendance: detail.playerCount,
        updatedAt: sql`NOW()`,
      })
      .where(eq(tournamentTable.id, input.tournamentId));
  }

  await db
    .update(tournamentWeekendTournament)
    .set({
      status: detail.status,
      hasDecklists: detail.hasDecklists,
      exactStart: detail.exactStart,
      additionalData,
      lastUpdatedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(tournamentWeekendTournament.tournamentWeekendId, input.weekendId),
        eq(tournamentWeekendTournament.tournamentId, input.tournamentId),
      ),
    );

  let queuedImport = false;
  if (
    detail.status === 'finished' &&
    expectsDecklists &&
    detail.hasDecklists &&
    !row.tournament.imported
  ) {
    const inserted = await db
      .insert(tournamentImport)
      .values({
        tournamentId: input.tournamentId,
      })
      .onConflictDoNothing()
      .returning({ tournamentId: tournamentImport.tournamentId });

    queuedImport = inserted.length > 0;
  }

  let progress = null;
  if (
    detail.status === 'running' ||
    (detail.status === 'finished' &&
      expectsDecklists &&
      hasMissingProgressFields(row.weekendTournament))
  ) {
    progress = await liveTournamentProgressCheck(input);
  }

  await recomputeTournamentWeekendCounters(input.weekendId);

  const result: LiveTournamentCheckResult = {
    type: 'checked',
    weekendId: input.weekendId,
    tournamentId: input.tournamentId,
    meleeId,
    status: detail.status,
    hasDecklists: detail.hasDecklists,
    queuedImport,
    progress,
  };

  await publishLiveTournamentChecked(result);

  return result;
}
