import { createTournamentScreenshotterScope } from '../../types/Screenshotter.ts';
import { captureScreenshots } from './captureScreenshots.ts';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { tournament } from '../db/schema/tournament.ts';
import { isLimitedFormat } from '../../types/Format.ts';

export type ScreenshotterAfterImportResult =
  | {
      status: 'skipped';
      reason: string;
      tournamentId: string;
    }
  | {
      status: 'completed';
      tournamentId: string;
      success: number;
      errors: number;
      manifestUrl?: string;
    }
  | {
      status: 'failed';
      tournamentId: string;
      error: string;
    };

function readBooleanEnv(name: string) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return false;

  return ['1', 'true', 'yes', 'on'].includes(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function shouldRunScreenshotterAfterImport() {
  return readBooleanEnv('SCREENSHOTTER_RUN_AFTER_IMPORT');
}

export async function runTournamentScreenshotterAfterImport(
  tournamentId: string,
): Promise<ScreenshotterAfterImportResult> {
  if (!shouldRunScreenshotterAfterImport()) {
    return {
      status: 'skipped',
      reason: 'SCREENSHOTTER_RUN_AFTER_IMPORT is not enabled.',
      tournamentId,
    };
  }

  try {
    console.log(`[screenshotter after import] Starting for tournament ${tournamentId}.`);

    const [event] = await db
      .select({ format: tournament.format, bracketInfo: tournament.bracketInfo })
      .from(tournament)
      .where(eq(tournament.id, tournamentId))
      .limit(1);
    const limited = event && isLimitedFormat(event.format);
    if (limited && (!event.bracketInfo || event.bracketInfo === 'none')) {
      return {
        status: 'skipped',
        tournamentId,
        reason: 'Limited tournament has no top-cut bracket to capture.',
      };
    }

    const result = await captureScreenshots({
      scope: createTournamentScreenshotterScope(tournamentId),
      targets: limited ? ['bracket'] : undefined,
    });

    const success = result.manifest.results.filter(item => item.ok).length;
    const errors = result.manifest.results.length - success;

    if (errors > 0) {
      console.warn(
        `[screenshotter after import] Tournament ${tournamentId} completed with ${success} successful targets and ${errors} failed targets.`,
      );
    } else {
      console.log(
        `[screenshotter after import] Tournament ${tournamentId} completed with ${success} successful targets.`,
      );
    }

    return {
      status: 'completed',
      tournamentId,
      success,
      errors,
      manifestUrl: result.manifestUpload?.url,
    };
  } catch (error) {
    const message = getErrorMessage(error);

    console.error(`[screenshotter after import] Failed for tournament ${tournamentId}:`, error);

    return {
      status: 'failed',
      tournamentId,
      error: message,
    };
  }
}
