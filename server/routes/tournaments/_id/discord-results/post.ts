import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
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

const zTournamentDiscordResultsRequest = z.object({
  force: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  runScreenshotter: z.boolean().optional(),
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isValidationError(error: unknown) {
  return (
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

export const tournamentIdDiscordResultsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentDiscordResultsRequest),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const tournamentId = c.req.param('id');
    if (!tournamentId) {
      return c.json({ message: 'Tournament id is required.' }, 400);
    }

    try {
      const request = c.req.valid('json');
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
  },
);
