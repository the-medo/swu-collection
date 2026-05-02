import { Hono } from 'hono';
import { createTournamentScreenshotterScope } from '../../../../../types/Screenshotter.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { captureScreenshots, ScreenshotterValidationError } from '../../../../screenshotter';
import type { CaptureScreenshotsResult } from '../../../../screenshotter';
import {
  getTournamentResultsDiscordConfig,
  sendTournamentResultsDiscordMessage,
  TournamentResultsDiscordValidationError,
} from '../../../../lib/discord';

type TournamentDiscordResultsRequest = {
  force?: boolean;
  dryRun?: boolean;
  runScreenshotter?: boolean;
};

class TournamentDiscordResultsRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TournamentDiscordResultsRequestError';
  }
}

function parseTournamentDiscordResultsRequest(body: unknown): TournamentDiscordResultsRequest {
  if (body === undefined || body === null) return {};

  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new TournamentDiscordResultsRequestError('Request body must be a JSON object.');
  }

  const request = body as Record<string, unknown>;

  for (const key of ['force', 'dryRun', 'runScreenshotter']) {
    if (request[key] !== undefined && typeof request[key] !== 'boolean') {
      throw new TournamentDiscordResultsRequestError(`${key} must be a boolean when provided.`);
    }
  }

  return {
    force: request.force as boolean | undefined,
    dryRun: request.dryRun as boolean | undefined,
    runScreenshotter: request.runScreenshotter as boolean | undefined,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isValidationError(error: unknown) {
  return (
    error instanceof TournamentDiscordResultsRequestError ||
    error instanceof TournamentResultsDiscordValidationError ||
    error instanceof ScreenshotterValidationError
  );
}

function isConfigurationError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes('DISCORD_') ||
    error.message.includes('SCREENSHOTTER_') ||
    error.message.includes('R2 upload requires') ||
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
    manifestUrl: result.manifestUpload?.url,
    persistence: result.persistence,
    manifest: result.manifest,
  };
}

function getSuccessMessage(status: string, tournamentId: string) {
  if (status === 'sent') {
    return `Discord tournament results notification sent for tournament ${tournamentId}.`;
  }

  if (status === 'dry-run') {
    return `Discord tournament results dry run completed for tournament ${tournamentId}.`;
  }

  if (status === 'skipped') {
    return `Discord tournament results notification skipped for tournament ${tournamentId}.`;
  }

  return `Discord tournament results notification failed for tournament ${tournamentId}.`;
}

export const tournamentIdDiscordResultsPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const admin = await requireAdmin(c);
  if (admin.response) return admin.response;

  const tournamentId = c.req.param('id');
  if (!tournamentId) {
    return c.json({ message: 'Tournament id is required.' }, 400);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const request = parseTournamentDiscordResultsRequest(body);
    const config = getTournamentResultsDiscordConfig({
      requireConfigured: !request.dryRun,
    });

    const screenshotterResult = request.runScreenshotter
      ? await captureScreenshots({
          scope: createTournamentScreenshotterScope(tournamentId),
        })
      : undefined;

    const result = await sendTournamentResultsDiscordMessage({
      tournamentId,
      force: request.force,
      dryRun: request.dryRun,
      config,
    });

    const status = result.status === 'failed' ? 500 : 200;

    return c.json(
      {
        message: getSuccessMessage(result.status, tournamentId),
        data: result,
        meta: {
          force: request.force ?? false,
          dryRun: request.dryRun ?? false,
          runScreenshotter: request.runScreenshotter ?? false,
          screenshotter: summarizeScreenshotterResult(screenshotterResult),
        },
      },
      status,
    );
  } catch (error) {
    const status = isValidationError(error) ? 400 : 500;

    console.error('[tournament discord results endpoint] Error:', error);

    return c.json(
      {
        message:
          status === 400
            ? 'Invalid tournament Discord results request'
            : isConfigurationError(error)
              ? 'Discord tournament results notification is not configured correctly'
              : 'Failed to run Discord tournament results notification',
        error: getErrorMessage(error),
      },
      status,
    );
  }
});
