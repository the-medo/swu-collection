import { createTournamentScreenshotterScope } from '../../../types/Screenshotter.ts';
import { captureScreenshots, ScreenshotterValidationError } from '../../screenshotter';
import { getTournamentResultsDiscordConfig } from './config.ts';
import {
  sendTournamentResultsDiscordMessage,
  TournamentResultsDiscordValidationError,
} from './tournamentResults.ts';
import type { CaptureScreenshotsResult } from '../../screenshotter';
import type { TournamentResultsDiscordResult } from './types.ts';

type RunTournamentResultsNotificationOptions = {
  tournamentId?: string;
  force?: boolean;
  dryRun?: boolean;
  runScreenshotter?: boolean;
  json?: boolean;
  help?: boolean;
};

export type RunTournamentResultsNotificationResult = {
  exitCode: number;
};

class DiscordTournamentResultsCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscordTournamentResultsCliError';
  }
}

function readFlagValue(args: string[], index: number, flagName: string, inlineValue?: string) {
  if (inlineValue !== undefined) return { value: inlineValue, nextIndex: index };

  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new DiscordTournamentResultsCliError(`Missing value for --${flagName}.`);
  }

  return { value, nextIndex: index + 1 };
}

function parseRunTournamentResultsNotificationArgs(
  argv: string[],
): RunTournamentResultsNotificationOptions {
  const options: RunTournamentResultsNotificationOptions = {};

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      if (!options.tournamentId) {
        options.tournamentId = arg;
        continue;
      }

      throw new DiscordTournamentResultsCliError(`Unexpected positional argument: ${arg}`);
    }

    const [flagName, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);

    switch (flagName) {
      case 'help':
        options.help = true;
        break;
      case 'json':
        options.json = true;
        break;
      case 'force':
        options.force = true;
        break;
      case 'dry-run':
        options.dryRun = true;
        break;
      case 'run-screenshotter':
        options.runScreenshotter = true;
        break;
      case 'tournament-id': {
        const parsed = readFlagValue(argv, index, flagName, inlineValue);
        options.tournamentId = parsed.value;
        index = parsed.nextIndex;
        break;
      }
      default:
        throw new DiscordTournamentResultsCliError(`Unknown option: --${flagName}`);
    }
  }

  return options;
}

function printRunTournamentResultsNotificationUsage() {
  console.log(`Usage:
  bun server/lib/discord/runTournamentResultsNotification.ts --tournament-id <uuid>

Options:
  --force
  --dry-run
  --run-screenshotter
  --json
`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isConfigOrValidationError(error: unknown) {
  if (
    error instanceof DiscordTournamentResultsCliError ||
    error instanceof TournamentResultsDiscordValidationError ||
    error instanceof ScreenshotterValidationError
  ) {
    return true;
  }

  if (!(error instanceof Error)) return false;

  return (
    error.message.includes('DISCORD_') ||
    error.message.includes('SCREENSHOTTER_') ||
    error.message.includes('must be a positive number')
  );
}

function summarizeScreenshotterResult(result: CaptureScreenshotsResult | undefined) {
  if (!result) return undefined;

  const success = result.manifest.results.filter(item => item.ok).length;
  const errors = result.manifest.results.length - success;

  return {
    success,
    errors,
    manifest: result.manifest,
    manifestUrl: result.manifestUpload?.url,
    persistence: result.persistence,
  };
}

function printTextSummary(
  result: TournamentResultsDiscordResult,
  screenshotterResult: CaptureScreenshotsResult | undefined,
) {
  const screenshotterSummary = summarizeScreenshotterResult(screenshotterResult);

  if (screenshotterSummary) {
    console.log(
      `[discord tournament results] Screenshotter completed: ${screenshotterSummary.success} successful, ${screenshotterSummary.errors} failed.`,
    );
  }

  if (result.status === 'sent') {
    console.log(
      `[discord tournament results] Sent message ${result.discordMessageId} for tournament ${result.tournamentId}.`,
    );
    return;
  }

  if (result.status === 'dry-run') {
    console.log(
      `[discord tournament results] Dry-run payload for tournament ${result.tournamentId}:`,
    );
    console.log(JSON.stringify(result.payload, null, 2));
    return;
  }

  if (result.status === 'skipped') {
    console.log(
      `[discord tournament results] Skipped tournament ${result.tournamentId}: ${result.reason}`,
    );
    return;
  }

  console.error(
    `[discord tournament results] Failed tournament ${result.tournamentId}: ${result.error}`,
  );
}

export async function runTournamentResultsNotificationFromArgv(
  argv: string[],
): Promise<RunTournamentResultsNotificationResult> {
  let parsed: RunTournamentResultsNotificationOptions | undefined;

  try {
    parsed = parseRunTournamentResultsNotificationArgs(argv);

    if (parsed.help) {
      printRunTournamentResultsNotificationUsage();
      return { exitCode: 0 };
    }

    if (!parsed.tournamentId) {
      throw new DiscordTournamentResultsCliError('Missing required --tournament-id.');
    }

    const config = getTournamentResultsDiscordConfig({
      requireConfigured: !parsed.dryRun,
    });

    const screenshotterResult = parsed.runScreenshotter
      ? await captureScreenshots({
          scope: createTournamentScreenshotterScope(parsed.tournamentId),
        })
      : undefined;

    const result = await sendTournamentResultsDiscordMessage({
      tournamentId: parsed.tournamentId,
      force: parsed.force,
      dryRun: parsed.dryRun,
      config,
    });

    const exitCode = result.status === 'failed' ? 1 : 0;

    if (parsed.json) {
      console.log(
        JSON.stringify(
          {
            ok: result.status !== 'failed',
            exitCode,
            screenshotter: summarizeScreenshotterResult(screenshotterResult),
            result,
          },
          null,
          2,
        ),
      );
    } else {
      printTextSummary(result, screenshotterResult);
    }

    return { exitCode };
  } catch (error) {
    const exitCode = isConfigOrValidationError(error) ? 2 : 1;

    if (parsed?.json) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: getErrorMessage(error),
            exitCode,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(`[discord tournament results] Error: ${getErrorMessage(error)}`);
    }

    return { exitCode };
  }
}

if (import.meta.main) {
  runTournamentResultsNotificationFromArgv(process.argv.slice(2))
    .then(({ exitCode }) => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('[discord tournament results] Unhandled error:', error);
      process.exit(1);
    });
}
