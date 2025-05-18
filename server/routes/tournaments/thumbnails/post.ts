import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { generateTournamentThumbnails } from '../../../lib/tournaments/generateTournamentThumbnail.ts';
import { zGenerateThumbnailsParams } from '../../../../types/ZGenerateThumbnailsParams.ts';

export const tournamentsThumbnailsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('query', zGenerateThumbnailsParams),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    // Check if user has admin permission
    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          admin: ['access'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to generate tournament thumbnails.",
        },
        403,
      );
    }

    const { force, tournament_id } = c.req.valid('query');

    console.log('Force parameter:', force, 'Type:', typeof force, force ? 'Forced!' : 'Not forced.');
    console.log('Tournament ID:', tournament_id);

    try {
      // Generate thumbnails for tournaments
      const { results, errors } = await generateTournamentThumbnails({
        tournament_id,
        force,
      });

      const sourceMessage = tournament_id 
        ? `for tournament ${tournament_id}` 
        : `for all tournaments`;

      return c.json(
        {
          message: `Generated thumbnails ${sourceMessage}. ${results.length} successful, ${errors.length} errors.`,
          data: {
            success: results.length,
            errors: errors.length,
            thumbnails: results,
            errorDetails: errors,
            tournamentId: tournament_id || undefined,
          },
        },
        200,
      );
    } catch (error) {
      console.error('Error generating tournament thumbnails:', error);
      return c.json(
        {
          message: 'Failed to generate tournament thumbnails',
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);