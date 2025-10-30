import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zTournamentUpdateRequest } from '../../../../types/ZTournament.ts';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { tournament as tournamentTable } from '../../../db/schema/tournament.ts';
import { db } from '../../../db';
import { computeAndSaveMetaStatistics } from '../../../lib/card-statistics';
import { generateTournamentThumbnail } from '../../../lib/tournaments/generateTournamentThumbnail.ts';
import { runInBackground } from '../../../lib/utils/backgroundProcess.ts';

export const tournamentIdPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zTournamentUpdateRequest),
  async c => {
    const paramTournamentId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isOwner = eq(tournamentTable.userId, user.id);
    const tournamentId = eq(tournamentTable.id, paramTournamentId);

    // Get the current tournament data to check if meta is changing and if tournament is imported
    const currentTournament = (
      await db.select().from(tournamentTable).where(and(isOwner, tournamentId))
    )[0];

    if (!currentTournament) {
      return c.json(
        {
          message: "Tournament doesn't exist or you don't have permission to update it",
        },
        404,
      );
    }

    // Check if meta field is being updated and tournament is imported
    const isMetaUpdated = data.meta !== undefined && data.meta !== currentTournament.meta;
    const isImported = currentTournament.imported;

    // Check if any fields that require thumbnail regeneration are updated
    const isThumbnailUpdateNeeded =
      (data.attendance !== undefined && data.attendance !== currentTournament.attendance) ||
      (data.name !== undefined && data.name !== currentTournament.name) ||
      (data.date !== undefined && new Date(data.date) !== currentTournament.date) ||
      (data.type !== undefined && data.type !== currentTournament.type);

    // Convert string date to a Date object if needed
    const dateValue = data.date
      ? typeof data.date === 'string'
        ? new Date(data.date)
        : data.date
      : undefined;

    const updateData = {
      ...data,
      date: dateValue,
      updatedAt: sql`NOW()`,
    };

    const updatedTournament = (
      await db.update(tournamentTable).set(updateData).where(and(isOwner, tournamentId)).returning()
    )[0];

    if (!updatedTournament) {
      return c.json(
        {
          message: "Tournament doesn't exist or you don't have permission to update it",
        },
        404,
      );
    }

    // If meta field was updated and tournament is imported, compute card statistics for both old and new meta
    if (isMetaUpdated && isImported) {
      // Store the old and new meta values
      const oldMeta = currentTournament.meta;
      const newMeta = updatedTournament.meta;

      // Compute statistics for both metas (if they exist)
      // We need to do this after the update to ensure we're working with the latest data
      try {
        // Compute statistics for old meta if it exists
        if (oldMeta) {
          await computeAndSaveMetaStatistics(oldMeta);
        }

        // Compute statistics for new meta if it exists
        if (newMeta) {
          await computeAndSaveMetaStatistics(newMeta);
        }
      } catch (error) {
        console.error('Error computing card statistics after meta update:', error);
        // We don't want to fail the request if statistics computation fails
      }
    }

    // Generate tournament thumbnail in the background if needed fields were updated
    if (isThumbnailUpdateNeeded) {
      runInBackground(
        generateTournamentThumbnail,
        {
          id: updatedTournament.id,
          type: updatedTournament.type,
          name: updatedTournament.name,
          date: updatedTournament.date,
          attendance: updatedTournament.attendance,
          countryCode: updatedTournament.location,
        },
        {
          forceUpload: true,
        },
      );
      console.log('Tournament thumbnail generation started in background');
    }

    return c.json({ data: updatedTournament });
  },
);
