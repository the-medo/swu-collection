import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import {
  createTournamentScreenshotterScope,
  defaultTournamentScreenshotTargets,
  screenshotterScopeTypes,
  tournamentScreenshotTargets,
  type ScreenshotterManifest,
  type ScreenshotterResult,
  type ScreenshotterScope,
  type ScreenshotterTarget,
  type TournamentScreenshotTarget,
} from '../../types/Screenshotter.ts';
import { db } from '../db';
import { tournament } from '../db/schema/tournament.ts';
import { getScreenshotterConfig } from './config.ts';
import { persistScreenshotterManifest } from './persistScreenshots.ts';
import { closeScreenshotterPageSession, createScreenshotterPageSession } from './playwright.ts';
import { uploadScreenshotToR2 } from './r2.ts';
import {
  buildTournamentMetaUrl,
  buildTournamentDetailsUrl,
  buildTournamentScreenshotR2Key,
  captureTournamentBracketScreenshot,
  captureTournamentMetaLeadersAndBaseAllScreenshot,
  captureTournamentMetaLeadersAndBaseTop8Screenshot,
  captureTournamentWinningDeckScreenshot,
  tournamentMetaScreenshotVariants,
} from './targets/tournament/index.ts';
import type {
  CaptureScreenshotsOptions,
  CaptureScreenshotsResult,
  ScreenshotterCapturedImage,
  ScreenshotterConfig,
  ScreenshotterOutputFile,
} from './types.ts';

type TournamentCaptureDefinition = {
  target: TournamentScreenshotTarget;
  sourceUrl: (config: ScreenshotterConfig, tournamentId: string) => string;
  capture: (input: {
    tournamentId: string;
    config: ScreenshotterConfig;
    page: Awaited<ReturnType<typeof createScreenshotterPageSession>>['page'];
  }) => Promise<ScreenshotterCapturedImage>;
};

export class ScreenshotterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScreenshotterValidationError';
  }
}

const tournamentCaptureDefinitions: Record<
  TournamentScreenshotTarget,
  TournamentCaptureDefinition
> = {
  [tournamentScreenshotTargets.bracket]: {
    target: tournamentScreenshotTargets.bracket,
    sourceUrl: buildTournamentDetailsUrl,
    capture: captureTournamentBracketScreenshot,
  },
  [tournamentScreenshotTargets.metaLeadersAndBaseAll]: {
    target: tournamentScreenshotTargets.metaLeadersAndBaseAll,
    sourceUrl: (config, tournamentId) =>
      buildTournamentMetaUrl(
        config,
        tournamentId,
        tournamentMetaScreenshotVariants.leadersAndBaseAll,
      ),
    capture: captureTournamentMetaLeadersAndBaseAllScreenshot,
  },
  [tournamentScreenshotTargets.metaLeadersAndBaseTop8]: {
    target: tournamentScreenshotTargets.metaLeadersAndBaseTop8,
    sourceUrl: (config, tournamentId) =>
      buildTournamentMetaUrl(
        config,
        tournamentId,
        tournamentMetaScreenshotVariants.leadersAndBaseTop8,
      ),
    capture: captureTournamentMetaLeadersAndBaseTop8Screenshot,
  },
  [tournamentScreenshotTargets.winningDeck]: {
    target: tournamentScreenshotTargets.winningDeck,
    sourceUrl: buildTournamentDetailsUrl,
    capture: captureTournamentWinningDeckScreenshot,
  },
};

function isTournamentTarget(target: ScreenshotterTarget): target is TournamentScreenshotTarget {
  return Object.values(tournamentScreenshotTargets).includes(target as TournamentScreenshotTarget);
}

function normalizeScope(scope: ScreenshotterScope): ScreenshotterScope {
  if (scope.type === screenshotterScopeTypes.tournament && scope.id) {
    return createTournamentScreenshotterScope(scope.id);
  }

  return scope;
}

function getDefaultTargetsForScope(scope: ScreenshotterScope): ScreenshotterTarget[] {
  if (scope.type === screenshotterScopeTypes.tournament) {
    return defaultTournamentScreenshotTargets;
  }

  throw new ScreenshotterValidationError(`Unsupported screenshotter scope type: ${scope.type}`);
}

function validateTargetsForScope(scope: ScreenshotterScope, targets: ScreenshotterTarget[]) {
  if (scope.type === screenshotterScopeTypes.tournament) {
    const unsupportedTarget = targets.find(target => !isTournamentTarget(target));

    if (unsupportedTarget) {
      throw new ScreenshotterValidationError(
        `Unsupported tournament screenshot target: ${unsupportedTarget}`,
      );
    }

    return;
  }

  throw new ScreenshotterValidationError(`Unsupported screenshotter scope type: ${scope.type}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function validateTournamentScope(scope: ScreenshotterScope) {
  if (!scope.id) {
    throw new ScreenshotterValidationError('Tournament screenshot scope requires scope id.');
  }

  const [record] = await db
    .select({
      id: tournament.id,
      imported: tournament.imported,
    })
    .from(tournament)
    .where(eq(tournament.id, scope.id));

  if (!record) {
    throw new ScreenshotterValidationError(`Tournament not found: ${scope.id}`);
  }

  if (!record.imported) {
    throw new ScreenshotterValidationError(`Tournament is not imported yet: ${scope.id}`);
  }
}

async function validateScope(scope: ScreenshotterScope) {
  if (scope.type === screenshotterScopeTypes.tournament) {
    await validateTournamentScope(scope);
    return;
  }

  throw new ScreenshotterValidationError(`Unsupported screenshotter scope type: ${scope.type}`);
}

function toResultFromCapture(captured: ScreenshotterCapturedImage): ScreenshotterResult {
  return {
    target: captured.target,
    sourceUrl: captured.sourceUrl,
    ok: true,
    r2Key: captured.r2Key,
    contentType: captured.contentType,
    byteSize: captured.byteSize,
    width: captured.width,
    height: captured.height,
  };
}

async function writeOutputFile(
  outputDir: string | undefined,
  captured: ScreenshotterCapturedImage,
): Promise<ScreenshotterOutputFile | undefined> {
  if (!outputDir) return undefined;

  await mkdir(outputDir, { recursive: true });

  const filePath = path.join(outputDir, path.basename(captured.r2Key));
  await writeFile(filePath, captured.body);

  return {
    target: captured.target,
    path: filePath,
  };
}

async function writeManifestOutputFile(
  outputDir: string | undefined,
  manifest: ScreenshotterManifest,
): Promise<ScreenshotterOutputFile | undefined> {
  if (!outputDir) return undefined;

  await mkdir(outputDir, { recursive: true });

  const filePath = path.join(outputDir, 'manifest.json');
  await writeFile(filePath, JSON.stringify(manifest, null, 2));

  return {
    target: 'manifest',
    path: filePath,
  };
}

async function captureTournamentTarget(
  scope: ScreenshotterScope,
  target: ScreenshotterTarget,
  config: ScreenshotterConfig,
  page: Awaited<ReturnType<typeof createScreenshotterPageSession>>['page'],
): Promise<ScreenshotterCapturedImage> {
  if (!scope.id) {
    throw new ScreenshotterValidationError('Tournament screenshot scope requires scope id.');
  }

  if (!isTournamentTarget(target)) {
    throw new ScreenshotterValidationError(`Unsupported tournament screenshot target: ${target}`);
  }

  return tournamentCaptureDefinitions[target].capture({
    tournamentId: scope.id,
    config,
    page,
  });
}

function getTournamentTargetSourceUrl(
  scope: ScreenshotterScope,
  target: ScreenshotterTarget,
  config: ScreenshotterConfig,
) {
  if (!scope.id || !isTournamentTarget(target)) return config.appBaseUrl;

  return tournamentCaptureDefinitions[target].sourceUrl(config, scope.id);
}

function getTargetSourceUrl(
  scope: ScreenshotterScope,
  target: ScreenshotterTarget,
  config: ScreenshotterConfig,
) {
  if (scope.type === screenshotterScopeTypes.tournament) {
    return getTournamentTargetSourceUrl(scope, target, config);
  }

  return config.appBaseUrl;
}

async function captureTarget(
  scope: ScreenshotterScope,
  target: ScreenshotterTarget,
  config: ScreenshotterConfig,
  page: Awaited<ReturnType<typeof createScreenshotterPageSession>>['page'],
) {
  if (scope.type === screenshotterScopeTypes.tournament) {
    return captureTournamentTarget(scope, target, config, page);
  }

  throw new ScreenshotterValidationError(`Unsupported screenshotter scope type: ${scope.type}`);
}

export async function captureScreenshots({
  scope,
  targets,
  skipUpload = false,
  outputDir,
  persist = true,
  config = getScreenshotterConfig(),
}: CaptureScreenshotsOptions): Promise<CaptureScreenshotsResult> {
  const normalizedScope = normalizeScope(scope);
  await validateScope(normalizedScope);

  const resolvedTargets = targets?.length ? targets : getDefaultTargetsForScope(normalizedScope);
  validateTargetsForScope(normalizedScope, resolvedTargets);

  const generatedAt = new Date().toISOString();
  const outputFiles: ScreenshotterOutputFile[] = [];
  const manifest: ScreenshotterManifest = {
    scope: normalizedScope,
    generatedAt,
    appBaseUrl: config.appBaseUrl,
    viewport: config.viewport,
    results: [],
  };

  const session = await createScreenshotterPageSession(config);

  try {
    for (const target of resolvedTargets) {
      try {
        const captured = await captureTarget(normalizedScope, target, config, session.page);
        const outputFile = await writeOutputFile(outputDir, captured);

        if (outputFile) {
          outputFiles.push(outputFile);
        }

        const result = toResultFromCapture(captured);

        if (!skipUpload) {
          const upload = await uploadScreenshotToR2(
            {
              key: captured.r2Key,
              body: captured.body,
              contentType: captured.contentType,
            },
            config,
          );

          result.url = upload.url;
          result.r2Key = upload.r2Key;
          result.byteSize = upload.byteSize;
          result.contentType = upload.contentType;
        }

        manifest.results.push(result);
      } catch (error) {
        manifest.results.push({
          target,
          sourceUrl: getTargetSourceUrl(normalizedScope, target, config),
          ok: false,
          error: getErrorMessage(error),
        });
      }
    }
  } finally {
    await closeScreenshotterPageSession(session);
  }

  const manifestOutputFile = await writeManifestOutputFile(outputDir, manifest);
  if (manifestOutputFile) {
    outputFiles.push(manifestOutputFile);
  }

  const result: CaptureScreenshotsResult = {
    manifest,
    outputFiles,
  };

  if (!skipUpload) {
    result.manifestUpload = await uploadScreenshotToR2(
      {
        key:
          normalizedScope.type === screenshotterScopeTypes.tournament && normalizedScope.id
            ? buildTournamentScreenshotR2Key(normalizedScope.id, 'manifest.json')
            : `screenshots/${normalizedScope.key}/manifest.json`,
        body: JSON.stringify(manifest, null, 2),
        contentType: 'application/json',
        cacheControl: 'public, max-age=60',
      },
      config,
    );

    if (persist) {
      result.persistence = await persistScreenshotterManifest(manifest);
    }
  }

  return result;
}
