import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import {
  tournamentImport,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import { publishLiveTournamentChecked } from './liveTournamentEvents.ts';
import { liveTournamentProgressCheck } from './liveTournamentProgressCheck.ts';
import { fetchLiveTournamentDetailFromMelee } from './melee.ts';
import { recomputeTournamentWeekendCounters } from './tournamentWeekendMaintenance.ts';
import type { LiveTournamentCheckInput, LiveTournamentCheckResult } from './types.ts';

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
  const additionalData = detail.additionalData ? JSON.stringify(detail.additionalData) : null;

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

  let progress = null;
  if (detail.status === 'running') {
    progress = await liveTournamentProgressCheck(input);
  }

  let queuedImport = false;
  if (detail.status === 'finished' && detail.hasDecklists) {
    const inserted = await db
      .insert(tournamentImport)
      .values({
        tournamentId: input.tournamentId,
      })
      .onConflictDoNothing()
      .returning({ tournamentId: tournamentImport.tournamentId });

    queuedImport = inserted.length > 0;
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
