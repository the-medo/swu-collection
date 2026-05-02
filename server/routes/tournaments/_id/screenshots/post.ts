import { Hono } from 'hono';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import {
  createTournamentScreenshotterScope,
  defaultTournamentScreenshotTargets,
  type TournamentScreenshotTarget,
} from '../../../../../types/Screenshotter.ts';
import { captureScreenshots, ScreenshotterValidationError } from '../../../../screenshotter';
import type { AuthExtension } from '../../../../auth/auth.ts';

const allowedTargets = new Set<string>(defaultTournamentScreenshotTargets);

type TournamentScreenshotRequest = {
  targets?: TournamentScreenshotTarget[];
  force?: boolean;
};

function parseTournamentScreenshotRequest(body: unknown): TournamentScreenshotRequest {
  if (body === undefined || body === null) return {};

  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new ScreenshotterValidationError('Request body must be a JSON object.');
  }

  const request = body as Record<string, unknown>;

  if (request.force !== undefined && typeof request.force !== 'boolean') {
    throw new ScreenshotterValidationError('force must be a boolean when provided.');
  }

  if (request.targets === undefined) {
    return {
      force: request.force as boolean | undefined,
    };
  }

  if (!Array.isArray(request.targets) || request.targets.length === 0) {
    throw new ScreenshotterValidationError('targets must be a non-empty array when provided.');
  }

  const targets = request.targets.map(target => {
    if (typeof target !== 'string' || !allowedTargets.has(target)) {
      throw new ScreenshotterValidationError(`Unsupported tournament screenshot target: ${target}`);
    }

    return target as TournamentScreenshotTarget;
  });

  return {
    targets,
    force: request.force as boolean | undefined,
  };
}

function isConfigurationError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return error.message.includes('SCREENSHOTTER_') || error.message.includes('R2 upload requires');
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export const tournamentIdScreenshotsPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const admin = await requireAdmin(c);
  if (admin.response) return admin.response;

  const tournamentId = c.req.param('id');
  if (!tournamentId) {
    return c.json({ message: 'Tournament id is required.' }, 400);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const request = parseTournamentScreenshotRequest(body);
    const result = await captureScreenshots({
      scope: createTournamentScreenshotterScope(tournamentId),
      targets: request.targets,
    });

    const successCount = result.manifest.results.filter(item => item.ok).length;
    const failureCount = result.manifest.results.length - successCount;
    const status = successCount > 0 ? 200 : 500;

    return c.json(
      {
        message:
          status === 200
            ? `Screenshotter completed for tournament ${tournamentId}. ${successCount} successful, ${failureCount} failed.`
            : `Screenshotter failed for every requested target for tournament ${tournamentId}.`,
        data: result.manifest,
        meta: {
          success: successCount,
          errors: failureCount,
          manifestUrl: result.manifestUpload?.url,
          persistence: result.persistence,
          force: request.force ?? false,
        },
      },
      status,
    );
  } catch (error) {
    const status = error instanceof ScreenshotterValidationError ? 400 : 500;

    console.error('[tournament screenshotter endpoint] Error:', error);

    return c.json(
      {
        message:
          status === 400
            ? 'Invalid tournament screenshot request'
            : isConfigurationError(error)
              ? 'Screenshotter is not configured correctly'
              : 'Failed to run tournament screenshotter',
        error: getErrorMessage(error),
      },
      status,
    );
  }
});
