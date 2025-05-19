import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { generateAllSetThumbnails } from '../../../lib/sets/generateSetThumbnails.ts';
import { zGenerateSetThumbnailsParams } from '../../../../types/ZGenerateSetThumbnailsParams.ts';

export const setsThumbnailsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('query', zGenerateSetThumbnailsParams),
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
          message: "You don't have permission to generate set thumbnails.",
        },
        403,
      );
    }

    const { set } = c.req.valid('query');

    console.log('Set parameter:', set);

    try {
      // Generate thumbnails for all sets or a specific set
      const { results, errors } = await generateAllSetThumbnails({
        set,
      });

      const sourceMessage = set 
        ? `for set ${set}` 
        : `for all sets`;

      return c.json(
        {
          message: `Generated thumbnails ${sourceMessage}. ${errors.length} errors.`,
          data: {
            success: results.length,
            errors: errors.length,
            thumbnails: results,
            errorDetails: errors,
            set: set || undefined,
          },
        },
        200,
      );
    } catch (error) {
      console.error('Error generating set thumbnails:', error);
      return c.json(
        {
          message: 'Failed to generate set thumbnails',
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);