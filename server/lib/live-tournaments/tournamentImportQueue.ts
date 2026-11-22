import { and, asc, eq, lte, or, sql } from 'drizzle-orm';
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
import {
  runTournamentImportedSideEffects,
  type TournamentImportedSideEffectsResult,
} from '../imports/tournamentImportedSideEffects.ts';
import { publishTournamentImportFinished } from './liveTournamentEvents.ts';
import { fetchLiveTournamentDetailFromMelee } from './melee.ts';
import { tournamentCanImportResults } from './tournamentFormat.ts';
import { TournamentImportNotReadyError } from '../imports/tournamentImportNotReady.ts';

const maxStoredErrorLength = 8000;

const serializeImportError = (error: unknown) => {
  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join('\n').slice(0, maxStoredErrorLength);
  }

  return String(error).slice(0, maxStoredErrorLength);
};

async function claimNextPendingImport() {
  const readyToClaim = and(
    eq(tournamentImport.status, 'pending'),
    or(
      eq(tournamentImport.attempts, 0),
      lte(tournamentImport.updatedAt, sql`NOW() - INTERVAL '5 minutes'`),
    ),
  );
  const pendingImport = (
    await db
      .select({ tournamentId: tournamentImport.tournamentId })
      .from(tournamentImport)
      .where(readyToClaim)
      .orderBy(asc(tournamentImport.updatedAt), asc(tournamentImport.createdAt))
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
      .where(and(eq(tournamentImport.tournamentId, pendingImport.tournamentId), readyToClaim))
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
      tournamentId?: string;
    }
  | {
      type: 'processed';
      tournamentId: string;
      attempts: number;
      computedMetaStatistics: boolean;
      thumbnailsGenerated: number;
      thumbnailErrors: number;
      dailySnapshot: TournamentImportedSideEffectsResult['dailySnapshot'];
      screenshotter: TournamentImportedSideEffectsResult['screenshotter'];
      discord: TournamentImportedSideEffectsResult['discord'];
      importedSideEffects: TournamentImportedSideEffectsResult;
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

    if (tournament.imported) {
      await db
        .update(tournamentImport)
        .set({
          status: 'finished',
          lastError: null,
          finishedAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(tournamentImport.tournamentId, claimedImport.tournamentId));

      return {
        type: 'skipped',
        tournamentId: claimedImport.tournamentId,
        reason: 'Tournament has already been imported.',
      };
    }

    if (!tournament.meleeId) throw new Error('Melee tournament ID is empty');
    const detail = await fetchLiveTournamentDetailFromMelee({
      meleeId: tournament.meleeId,
      tournament,
    });
    if (
      detail.status !== 'finished' ||
      !tournamentCanImportResults(tournament, detail.hasDecklists)
    ) {
      throw new TournamentImportNotReadyError(
        'Melee tournament is not finished or its decklists are not available yet.',
      );
    }

    await runTournamentImport(claimedImport.tournamentId, undefined, undefined, {
      requireCompletedRounds: true,
    });

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

    const importedSideEffects = await runTournamentImportedSideEffects(claimedImport.tournamentId);

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
      dailySnapshot: importedSideEffects.dailySnapshot,
      screenshotter: importedSideEffects.screenshotter,
      discord: importedSideEffects.discord,
      importedSideEffects,
    };
  } catch (error) {
    if (error instanceof TournamentImportNotReadyError) {
      // Keep the durable job for a later check, without starving newly queued events.
      await db
        .update(tournamentImport)
        .set({
          status: 'pending',
          lastError: error.message,
          startedAt: null,
          finishedAt: null,
          updatedAt: sql`NOW()`,
        })
        .where(eq(tournamentImport.tournamentId, claimedImport.tournamentId));
      return { type: 'skipped', tournamentId: claimedImport.tournamentId, reason: error.message };
    }

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
