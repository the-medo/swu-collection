import type { ScreenshotterTarget } from '../../types/Screenshotter.ts';
import { ScreenshotterValidationError } from './captureScreenshots.ts';
import {
  parseTargetList,
  runScreenshotter,
  ScreenshotterCliError,
  type RunScreenshotterResult,
} from './runScreenshotter.ts';

type RunTournamentScreenshotsOptions = {
  tournamentId?: string;
  targets?: ScreenshotterTarget[];
  skipUpload?: boolean;
  outputDir?: string;
  json?: boolean;
  help?: boolean;
};

function readFlagValue(args: string[], index: number, flagName: string, inlineValue?: string) {
  if (inlineValue !== undefined) return { value: inlineValue, nextIndex: index };

  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new ScreenshotterCliError(`Missing value for --${flagName}.`);
  }

  return { value, nextIndex: index + 1 };
}

function parseRunTournamentScreenshotsArgs(argv: string[]): RunTournamentScreenshotsOptions {
  const options: RunTournamentScreenshotsOptions = {};

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      if (!options.tournamentId) {
        options.tournamentId = arg;
        continue;
      }

      throw new ScreenshotterCliError(`Unexpected positional argument: ${arg}`);
    }

    const [flagName, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);

    switch (flagName) {
      case 'help':
        options.help = true;
        break;
      case 'json':
        options.json = true;
        break;
      case 'skip-upload':
        options.skipUpload = true;
        break;
      case 'tournament-id': {
        const parsed = readFlagValue(argv, index, flagName, inlineValue);
        options.tournamentId = parsed.value;
        index = parsed.nextIndex;
        break;
      }
      case 'targets': {
        const parsed = readFlagValue(argv, index, flagName, inlineValue);
        options.targets = parseTargetList(parsed.value);
        index = parsed.nextIndex;
        break;
      }
      case 'output-dir': {
        const parsed = readFlagValue(argv, index, flagName, inlineValue);
        options.outputDir = parsed.value;
        index = parsed.nextIndex;
        break;
      }
      default:
        throw new ScreenshotterCliError(`Unknown option: --${flagName}`);
    }
  }

  return options;
}

function printRunTournamentScreenshotsUsage() {
  console.log(`Usage:
  bun server/screenshotter/runTournamentScreenshots.ts --tournament-id <uuid>

Options:
  --targets bracket,meta-leaders-and-base-all,meta-leaders-and-base-top8,winning-deck
  --skip-upload
  --output-dir .tmp/screenshots/<tournamentId>
  --json
`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isConfigError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes('SCREENSHOTTER_') || error.message.includes('must be a positive number')
  );
}

export async function runTournamentScreenshotsFromArgv(
  argv: string[],
): Promise<RunScreenshotterResult> {
  let parsed: RunTournamentScreenshotsOptions | undefined;

  try {
    parsed = parseRunTournamentScreenshotsArgs(argv);

    if (parsed.help) {
      printRunTournamentScreenshotsUsage();
      return { exitCode: 0 };
    }

    if (!parsed.tournamentId) {
      throw new ScreenshotterCliError('Missing required --tournament-id.');
    }

    return await runScreenshotter({
      scopeType: 'tournament',
      scopeId: parsed.tournamentId,
      targets: parsed.targets,
      skipUpload: parsed.skipUpload,
      outputDir: parsed.outputDir,
      json: parsed.json,
    });
  } catch (error) {
    const exitCode =
      error instanceof ScreenshotterCliError ||
      error instanceof ScreenshotterValidationError ||
      isConfigError(error)
        ? 2
        : 1;

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
      console.error(`[screenshotter] Error: ${getErrorMessage(error)}`);
    }

    return { exitCode };
  }
}

if (import.meta.main) {
  runTournamentScreenshotsFromArgv(process.argv.slice(2))
    .then(({ exitCode }) => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('[screenshotter] Unhandled error:', error);
      process.exit(1);
    });
}
