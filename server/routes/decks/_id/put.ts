import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckUpdateRequest } from '../../../../types/ZDeck.ts';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { db } from '../../../db';
import { updateDeckInformation } from '../../../lib/decks/updateDeckInformation.ts';
import { generateDeckThumbnail } from '../../../lib/decks/generateDeckThumbnail.ts';

export const deckIdPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zDeckUpdateRequest),
  async c => {
    const paramDeckId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isOwner = eq(deckTable.userId, user.id);
    const deckId = eq(deckTable.id, paramDeckId);

    // Get the current deck data to check if leader or base card has changed
    const currentDeck = (
      await db.select().from(deckTable).where(and(isOwner, deckId))
    )[0];

    if (!currentDeck) {
      return c.json(
        {
          message: "Deck doesn't exist or you don't have permission to update it",
        },
        404
      );
    }

    // Check if leader or base card is being updated
    const isLeaderUpdated = data.leaderCardId1 !== undefined && data.leaderCardId1 !== currentDeck.leaderCardId1;
    const isBaseUpdated = data.baseCardId !== undefined && data.baseCardId !== currentDeck.baseCardId;

    const updatedDeck = (
      await db
        .update(deckTable)
        .set({
          ...data,
          updatedAt: sql`NOW()`,
        })
        .where(and(isOwner, deckId))
        .returning()
    )[0];

    await updateDeckInformation(paramDeckId);

    // Generate deck thumbnail if leader or base card has changed
    if ((isLeaderUpdated || isBaseUpdated) && updatedDeck.leaderCardId1 && updatedDeck.baseCardId) {
      try {
        await generateDeckThumbnail(updatedDeck.leaderCardId1, updatedDeck.baseCardId);
      } catch (error) {
        console.error('Error generating deck thumbnail:', error);
        // Don't fail the request if thumbnail generation fails
      }
    }

    return c.json({ data: updatedDeck });
  },
);
