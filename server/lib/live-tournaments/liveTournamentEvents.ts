import type { LiveTournamentCheckResult, LiveTournamentProgressCheckResult } from './types.ts';
import { db } from '../../db';
import { tournamentWeekendTournament } from '../../db/schema/tournament_weekend.ts';
import { eq } from 'drizzle-orm';
import {
  createLiveTournamentSummaryPatchEvent,
  createLiveWeekendSummaryPatchEvent,
} from './liveTournamentHomeCache.ts';

export async function publishLiveTournamentChecked(result: LiveTournamentCheckResult) {
  if (result.type !== 'checked') return null;

  return Promise.all([
    createLiveWeekendSummaryPatchEvent(result.weekendId),
    createLiveTournamentSummaryPatchEvent(
      'live_tournament.updated',
      result.weekendId,
      result.tournamentId,
    ),
  ]);
}

export async function publishLiveTournamentProgressChecked(
  result: LiveTournamentProgressCheckResult,
) {
  if (result.type !== 'checked') return null;

  return createLiveTournamentSummaryPatchEvent(
    'live_tournament.progress_updated',
    result.weekendId,
    result.tournamentId,
  );
}

export async function publishTournamentImportFinished(result: {
  tournamentId: string;
  importedAt: string;
}) {
  const weekendRows = await db
    .select({ weekendId: tournamentWeekendTournament.tournamentWeekendId })
    .from(tournamentWeekendTournament)
    .where(eq(tournamentWeekendTournament.tournamentId, result.tournamentId));

  return Promise.all(
    weekendRows.map(row =>
      createLiveTournamentSummaryPatchEvent(
        'tournament_import.finished',
        row.weekendId,
        result.tournamentId,
      ),
    ),
  );
}
