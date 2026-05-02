import {
  runTournamentScreenshotterAfterImport,
  type ScreenshotterAfterImportResult,
} from '../../screenshotter';
import runDailySnapshot, {
  type DailySnapshotRunResult,
} from '../daily-snapshots/daily-snapshot-main.ts';
import {
  runTournamentResultsDiscordAfterImport,
  type TournamentResultsDiscordAfterImportResult,
} from '../discord';

export type DailySnapshotAfterImportResult =
  | {
      status: 'completed';
      tournamentId: string;
      result: DailySnapshotRunResult;
    }
  | {
      status: 'failed';
      tournamentId: string;
      error: string;
    };

export type TournamentImportedSideEffectsResult = {
  tournamentId: string;
  dailySnapshot: DailySnapshotAfterImportResult;
  screenshotter: ScreenshotterAfterImportResult;
  discord: TournamentResultsDiscordAfterImportResult;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function runDailySnapshotAfterImport(
  tournamentId: string,
): Promise<DailySnapshotAfterImportResult> {
  try {
    console.log(`[daily-snapshot after import] Starting for tournament ${tournamentId}.`);

    const result = await runDailySnapshot();

    console.log(
      `[daily-snapshot after import] Completed for tournament ${tournamentId} with date ${result.date}.`,
    );

    return {
      status: 'completed',
      tournamentId,
      result,
    };
  } catch (error) {
    const message = getErrorMessage(error);

    console.error(`[daily-snapshot after import] Failed for tournament ${tournamentId}:`, error);

    return {
      status: 'failed',
      tournamentId,
      error: message,
    };
  }
}

export async function runTournamentImportedSideEffects(
  tournamentId: string,
): Promise<TournamentImportedSideEffectsResult> {
  const dailySnapshot = await runDailySnapshotAfterImport(tournamentId);
  const screenshotter = await runTournamentScreenshotterAfterImport(tournamentId);
  const discord = await runTournamentResultsDiscordAfterImport(tournamentId);

  return {
    tournamentId,
    dailySnapshot,
    screenshotter,
    discord,
  };
}
