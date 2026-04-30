import { pathToFileURL } from 'node:url';
import {
  screenshotterScopeTypes,
  tournamentScreenshotTargets,
  type ScreenshotterScope,
  type ScreenshotterTarget,
  type TournamentScreenshotTarget,
} from '../../types/Screenshotter.ts';
import { closeScreenshotterPageSession, createScreenshotterPageSession } from './playwright.ts';
import {
  buildTournamentMetaUrl,
  buildTournamentDetailsUrl,
  captureTournamentBracketScreenshot,
  captureTournamentMetaLeadersAndBaseAllScreenshot,
  captureTournamentMetaLeadersAndBaseTop8Screenshot,
  captureTournamentWinningDeckScreenshot,
  tournamentMetaScreenshotVariants,
} from './targets/tournament/index.ts';
import type {
  ScreenshotterCapturedImage,
  ScreenshotterConfig,
  ScreenshotterPageSession,
} from './types.ts';

type NodeCaptureWorkerRequest = {
  scope: ScreenshotterScope;
  targets: ScreenshotterTarget[];
  config: ScreenshotterConfig;
};

type NodeCapturedImage = Omit<ScreenshotterCapturedImage, 'body'> & {
  ok: true;
  bodyBase64: string;
};

type NodeFailedCapture = {
  ok: false;
  target: ScreenshotterTarget;
  sourceUrl: string;
  error: string;
};

type TournamentCaptureDefinition = {
  sourceUrl: (config: ScreenshotterConfig, tournamentId: string) => string;
  capture: (input: {
    tournamentId: string;
    config: ScreenshotterConfig;
    page: ScreenshotterPageSession['page'];
  }) => Promise<ScreenshotterCapturedImage>;
};

const tournamentCaptureDefinitions: Record<
  TournamentScreenshotTarget,
  TournamentCaptureDefinition
> = {
  [tournamentScreenshotTargets.bracket]: {
    sourceUrl: buildTournamentDetailsUrl,
    capture: captureTournamentBracketScreenshot,
  },
  [tournamentScreenshotTargets.metaLeadersAndBaseAll]: {
    sourceUrl: (config, tournamentId) =>
      buildTournamentMetaUrl(
        config,
        tournamentId,
        tournamentMetaScreenshotVariants.leadersAndBaseAll,
      ),
    capture: captureTournamentMetaLeadersAndBaseAllScreenshot,
  },
  [tournamentScreenshotTargets.metaLeadersAndBaseTop8]: {
    sourceUrl: (config, tournamentId) =>
      buildTournamentMetaUrl(
        config,
        tournamentId,
        tournamentMetaScreenshotVariants.leadersAndBaseTop8,
      ),
    capture: captureTournamentMetaLeadersAndBaseTop8Screenshot,
  },
  [tournamentScreenshotTargets.winningDeck]: {
    sourceUrl: buildTournamentDetailsUrl,
    capture: captureTournamentWinningDeckScreenshot,
  },
};

function isTournamentTarget(target: ScreenshotterTarget): target is TournamentScreenshotTarget {
  return Object.values(tournamentScreenshotTargets).includes(target as TournamentScreenshotTarget);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getTournamentSourceUrl(
  scope: ScreenshotterScope,
  target: ScreenshotterTarget,
  config: ScreenshotterConfig,
) {
  if (!scope.id || !isTournamentTarget(target)) return config.appBaseUrl;

  return tournamentCaptureDefinitions[target].sourceUrl(config, scope.id);
}

async function readStdin() {
  let input = '';

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  return input;
}

function toNodeCapturedImage(captured: ScreenshotterCapturedImage): NodeCapturedImage {
  return {
    ...captured,
    ok: true,
    bodyBase64: captured.body.toString('base64'),
  };
}

async function captureTarget(
  request: NodeCaptureWorkerRequest,
  target: ScreenshotterTarget,
  page: ScreenshotterPageSession['page'],
): Promise<NodeCapturedImage | NodeFailedCapture> {
  if (request.scope.type !== screenshotterScopeTypes.tournament || !request.scope.id) {
    throw new Error(`Unsupported screenshotter scope type: ${request.scope.type}`);
  }

  if (!isTournamentTarget(target)) {
    throw new Error(`Unsupported tournament screenshot target: ${target}`);
  }

  try {
    const captured = await tournamentCaptureDefinitions[target].capture({
      tournamentId: request.scope.id,
      config: request.config,
      page,
    });

    return toNodeCapturedImage(captured);
  } catch (error) {
    return {
      ok: false,
      target,
      sourceUrl: getTournamentSourceUrl(request.scope, target, request.config),
      error: getErrorMessage(error),
    };
  }
}

async function runNodeCaptureWorker() {
  const input = await readStdin();
  const request = JSON.parse(input) as NodeCaptureWorkerRequest;
  const session = await createScreenshotterPageSession(request.config);
  const captures: Array<NodeCapturedImage | NodeFailedCapture> = [];

  try {
    for (const target of request.targets) {
      captures.push(await captureTarget(request, target, session.page));
    }
  } finally {
    await closeScreenshotterPageSession(session);
  }

  process.stdout.write(JSON.stringify({ ok: true, captures }));
}

function isMainModule() {
  const entryPoint = process.argv[1];
  return Boolean(entryPoint && import.meta.url === pathToFileURL(entryPoint).href);
}

if (isMainModule()) {
  runNodeCaptureWorker().catch(error => {
    process.stdout.write(
      JSON.stringify({
        ok: false,
        error: getErrorMessage(error),
      }),
    );
    process.exitCode = 1;
  });
}
