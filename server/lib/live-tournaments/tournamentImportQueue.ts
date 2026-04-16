import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import { tournamentImport } from '../../db/schema/tournament_weekend.ts';
import {
  computeAndSaveMetaStatistics,
  computeAndSaveTournamentStatistics,
} from '../card-statistics';
import { updateTournamentGroupsStatisticsForTournament } from '../card-statistics/update-tournament-group-statistics.ts';
import { generateDeckThumbnails } from '../decks/generateDeckThumbnail.ts';
import { runTournamentImport } from '../imports/tournamentImportWorkflow.ts';
import { publishTournamentImportFinished } from './liveTournamentEvents.ts';

const maxStoredErrorLength = 8000;

const serializeImportError = (error: unknown) => {
  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join('\n').slice(0, maxStoredErrorLength);
  }

  return String(error).slice(0, maxStoredErrorLength);
};

async function claimNextPendingImport() {
  const pendingImport = (
    await db
      .select({ tournamentId: tournamentImport.tournamentId })
      .from(tournamentImport)
      .where(eq(tournamentImport.status, 'pending'))
      .orderBy(asc(tournamentImport.createdAt))
      .limit(1)
  )[0];

  if (!pendingImport) return null;

  return (
    await db
      .update(tournamentImport)
      .set({
        status: 'running',
        attempts: sql`${tournamentImport.attempts} + 1`,
        lastError: null,
        startedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(tournamentImport.tournamentId, pendingImport.tournamentId),
          eq(tournamentImport.status, 'pending'),
        ),
      )
      .returning({
        tournamentId: tournamentImport.tournamentId,
        attempts: tournamentImport.attempts,
      })
  )[0];
}

export type TournamentImportQueueResult =
  | {
      type: 'skipped';
      reason: string;
    }
  | {
      type: 'processed';
      tournamentId: string;
      attempts: number;
      computedMetaStatistics: boolean;
      thumbnailsGenerated: number;
      thumbnailErrors: number;
    };

export async function processNextTournamentImport(): Promise<TournamentImportQueueResult> {
  const claimedImport = await claimNextPendingImport();

  if (!claimedImport) {
    return {
      type: 'skipped',
      reason: 'No pending tournament import found.',
    };
  }

  try {
    const tournament = (
      await db
        .select()
        .from(tournamentTable)
        .where(eq(tournamentTable.id, claimedImport.tournamentId))
        .limit(1)
    )[0];

    if (!tournament) {
      throw new Error(`Tournament ${claimedImport.tournamentId} not found.`);
    }

    await runTournamentImport(claimedImport.tournamentId);

    await db
      .update(tournamentTable)
      .set({
        imported: true,
        updatedAt: sql`NOW()`,
      })
      .where(eq(tournamentTable.id, claimedImport.tournamentId));

    await computeAndSaveTournamentStatistics(claimedImport.tournamentId);

    if (tournament.meta) {
      await computeAndSaveMetaStatistics(tournament.meta);
    }

    await updateTournamentGroupsStatisticsForTournament(claimedImport.tournamentId);

    const thumbnails = await generateDeckThumbnails({
      tournament_id: claimedImport.tournamentId,
      force: false,
    });

    await db
      .update(tournamentImport)
      .set({
        status: 'finished',
        lastError: null,
        finishedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(tournamentImport.tournamentId, claimedImport.tournamentId));

    await publishTournamentImportFinished({
      tournamentId: claimedImport.tournamentId,
      importedAt: new Date().toISOString(),
    });

    return {
      type: 'processed',
      tournamentId: claimedImport.tournamentId,
      attempts: claimedImport.attempts,
      computedMetaStatistics: tournament.meta !== null,
      thumbnailsGenerated: thumbnails.results.length,
      thumbnailErrors: thumbnails.errors.length,
    };
  } catch (error) {
    await db
      .update(tournamentImport)
      .set({
        status: 'failed',
        lastError: serializeImportError(error),
        updatedAt: sql`NOW()`,
      })
      .where(eq(tournamentImport.tournamentId, claimedImport.tournamentId));

    throw error;
  }
}
