import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { deck } from '../../../db/schema/deck.ts';
import { generateDeckThumbnail } from '../../../lib/decks/generateDeckThumbnail.ts';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '../../../db';
import { zGenerateThumbnailsParams } from '../../../../types/ZGenerateThumbnailsParams.ts';

export const decksThumbnailsPostRoute = new Hono<AuthExtension>().post(
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
          message: "You don't have permission to generate deck thumbnails.",
        },
        403,
      );
    }

    const { force } = c.req.valid('query');

    console.log('Force parameter:', force, 'Type:', typeof force, force ? 'Forced!' : 'Not forced.');

    try {
      // Fetch all decks that have both a leader card and a base card, grouped by leader and base combinations
      const uniqueCombinations = await db
        .select({
          leaderId: deck.leaderCardId1,
          baseId: deck.baseCardId,
        })
        .from(deck)
        .where(and(eq(isNotNull(deck.leaderCardId1), true), eq(isNotNull(deck.baseCardId), true)))
        .groupBy(deck.leaderCardId1, deck.baseCardId);

      // Generate thumbnails for each unique leader/base combination
      const results = [];
      const errors = [];

      for (const deckItem of uniqueCombinations) {
        if (!deckItem.leaderId || !deckItem.baseId) continue;
        const key = `${deckItem.leaderId}_${deckItem.baseId}`;
        try {
          // Generate thumbnail
          const thumbnailUrl = await generateDeckThumbnail(deckItem.leaderId, deckItem.baseId, {
            forceUpload: force,
          });

          results.push({
            leaderBaseKey: key,
            thumbnailUrl,
          });
        } catch (error) {
          console.error(`Error generating thumbnail for leader/base combination ${key}:`, error);
          errors.push({
            leaderBaseKey: key,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return c.json(
        {
          message: `Generated thumbnails for ${results.length} unique leader/base combinations. ${errors.length} errors.`,
          data: {
            success: results.length,
            errors: errors.length,
            thumbnails: results,
            errorDetails: errors,
          },
        },
        200,
      );
    } catch (error) {
      console.error('Error generating deck thumbnails:', error);
      return c.json(
        {
          message: 'Failed to generate deck thumbnails',
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);
