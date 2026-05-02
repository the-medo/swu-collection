import { getTournamentResultsDiscordConfig } from './config.ts';
import { sendTournamentResultsDiscordMessage } from './tournamentResults.ts';
import type {
  TournamentResultsDiscordAfterImportResult,
  TournamentResultsDiscordConfig,
  TournamentResultsDiscordResult,
} from './types.ts';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function logTournamentResultsDiscordResult(result: TournamentResultsDiscordResult) {
  if (result.status === 'sent') {
    console.log(
      `[discord tournament results] Sent notification for tournament ${result.tournamentId}: ${result.discordMessageId}.`,
    );
    return;
  }

  if (result.status === 'skipped') {
    console.log(
      `[discord tournament results] Skipped notification for tournament ${result.tournamentId}: ${result.reason}`,
    );
    return;
  }

  if (result.status === 'failed') {
    console.error(
      `[discord tournament results] Failed notification for tournament ${result.tournamentId}: ${result.error}`,
    );
  }
}

export function shouldRunTournamentResultsDiscordAfterImport(
  config: TournamentResultsDiscordConfig = getTournamentResultsDiscordConfig(),
) {
  return config.enabled;
}

export async function runTournamentResultsDiscordAfterImport(
  tournamentId: string,
): Promise<TournamentResultsDiscordAfterImportResult> {
  try {
    const config = getTournamentResultsDiscordConfig();

    if (!shouldRunTournamentResultsDiscordAfterImport(config)) {
      return {
        status: 'skipped',
        tournamentId,
        reason: 'DISCORD_TOURNAMENT_RESULTS_ENABLED is not enabled.',
      };
    }

    const result = await sendTournamentResultsDiscordMessage({
      tournamentId,
      config,
    });

    logTournamentResultsDiscordResult(result);

    return result;
  } catch (error) {
    const message = getErrorMessage(error);

    console.error(
      `[discord tournament results] Failed notification for tournament ${tournamentId}:`,
      error,
    );

    return {
      status: 'failed',
      tournamentId,
      error: message,
    };
  }
}
