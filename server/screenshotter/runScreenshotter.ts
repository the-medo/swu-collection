import {
  createTournamentScreenshotterScope,
  type ScreenshotterScope,
  type ScreenshotterTarget,
} from '../../types/Screenshotter.ts';
import { captureScreenshots, ScreenshotterValidationError } from './captureScreenshots.ts';
import type { CaptureScreenshotsResult } from './types.ts';

export type RunScreenshotterOptions = {
  scopeType: string;
  scopeId?: string;
  scopeKey?: string;
  targets?: ScreenshotterTarget[];
  skipUpload?: boolean;
  outputDir?: string;
  json?: boolean;
};

export type RunScreenshotterResult = {
  exitCode: number;
  result?: CaptureScreenshotsResult;
};

export class ScreenshotterCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScreenshotterCliError';
  }
}

export function parseTargetList(value: string): ScreenshotterTarget[] {
  return value
    .split(',')
    .map(target => target.trim())
    .filter(Boolean) as ScreenshotterTarget[];
}

function readFlagValue(args: string[], index: number, flagName: string, inlineValue?: string) {
  if (inlineValue !== undefined) return { value: inlineValue, nextIndex: index };

  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new ScreenshotterCliError(`Missing value for --${flagName}.`);
  }

  return { value, nextIndex: index + 1 };
}

export function parseRunScreenshotterArgs(argv: string[]): RunScreenshotterOptions & {
  help?: boolean;
} {
  const options: RunScreenshotterOptions & { help?: boolean } = {
    scopeType: '',
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
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
      case 'scope-type': {
        const parsed = readFlagValue(argv, index, flagName, inlineValue);
        options.scopeType = parsed.value;
        index = parsed.nextIndex;
        break;
      }
      case 'scope-id': {
        const parsed = readFlagValue(argv, index, flagName, inlineValue);
        options.scopeId = parsed.value;
        index = parsed.nextIndex;
        break;
      }
      case 'scope-key': {
        const parsed = readFlagValue(argv, index, flagName, inlineValue);
        options.scopeKey = parsed.value;
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

function buildScope(options: RunScreenshotterOptions): ScreenshotterScope {
  if (!options.scopeType) {
    throw new ScreenshotterCliError('Missing required --scope-type.');
  }

  if (options.scopeType === 'tournament') {
    if (!options.scopeId) {
      throw new ScreenshotterCliError('Tournament screenshotting requires --scope-id.');
    }

    return createTournamentScreenshotterScope(options.scopeId);
  }

  if (!options.scopeKey) {
    throw new ScreenshotterCliError('Non-tournament scopes require --scope-key.');
  }

  return {
    type: options.scopeType,
    id: options.scopeId ?? null,
    key: options.scopeKey,
  };
}

function isConfigError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes('SCREENSHOTTER_') || error.message.includes('must be a positive number')
  );
}

function serializeRunResult(runResult: CaptureScreenshotsResult) {
  const failures = runResult.manifest.results.filter(result => !result.ok);

  return {
    ok: failures.length === 0,
    failures,
    manifest: runResult.manifest,
    manifestUpload: runResult.manifestUpload,
    outputFiles: runResult.outputFiles,
    persistence: runResult.persistence,
  };
}

function printRunSummary(runResult: CaptureScreenshotsResult) {
  const successes = runResult.manifest.results.filter(result => result.ok);
  const failures = runResult.manifest.results.filter(result => !result.ok);

  console.log(`[screenshotter] Scope: ${runResult.manifest.scope.key}`);
  console.log(
    `[screenshotter] Targets: ${successes.length}/${runResult.manifest.results.length} succeeded`,
  );

  for (const result of runResult.manifest.results) {
    if (result.ok) {
      console.log(`  OK ${result.target}: ${result.url ?? result.r2Key ?? 'captured'}`);
    } else {
      console.log(`  FAIL ${result.target}: ${result.error ?? 'Unknown error'}`);
    }
  }

  if (runResult.manifestUpload) {
    console.log(`[screenshotter] Manifest: ${runResult.manifestUpload.url}`);
  }

  if (runResult.outputFiles.length > 0) {
    console.log('[screenshotter] Local output:');
    for (const outputFile of runResult.outputFiles) {
      console.log(`  ${outputFile.target}: ${outputFile.path}`);
    }
  }

  if (runResult.persistence) {
    console.log(
      `[screenshotter] Persisted rows: ${runResult.persistence.persisted.length}; skipped failures: ${runResult.persistence.skippedFailures.length}`,
    );
  }

  if (failures.length > 0) {
    console.log('[screenshotter] Completed with target failures.');
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function runScreenshotter(
  options: RunScreenshotterOptions,
): Promise<RunScreenshotterResult> {
  const scope = buildScope(options);
  const result = await captureScreenshots({
    scope,
    targets: options.targets,
    skipUpload: options.skipUpload,
    outputDir: options.outputDir,
  });
  const failedTargetCount = result.manifest.results.filter(targetResult => !targetResult.ok).length;
  const exitCode = failedTargetCount > 0 ? 1 : 0;

  if (options.json) {
    console.log(JSON.stringify(serializeRunResult(result), null, 2));
  } else {
    printRunSummary(result);
  }

  return { exitCode, result };
}

export function printRunScreenshotterUsage() {
  console.log(`Usage:
  bun server/screenshotter/runScreenshotter.ts --scope-type tournament --scope-id <uuid>

Options:
  --targets bracket,meta-leaders-and-base-all,meta-leaders-and-base-top8,winning-deck
  --skip-upload
  --output-dir .tmp/screenshots/<scope>
  --json
`);
}

export async function runScreenshotterFromArgv(argv: string[]): Promise<RunScreenshotterResult> {
  let parsed: ReturnType<typeof parseRunScreenshotterArgs> | undefined;

  try {
    parsed = parseRunScreenshotterArgs(argv);

    if (parsed.help) {
      printRunScreenshotterUsage();
      return { exitCode: 0 };
    }

    return await runScreenshotter(parsed);
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
  runScreenshotterFromArgv(process.argv.slice(2))
    .then(({ exitCode }) => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('[screenshotter] Unhandled error:', error);
      process.exit(1);
    });
}
