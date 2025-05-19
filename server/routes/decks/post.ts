import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckCreateRequest } from '../../../types/ZDeck.ts';
import { db } from '../../db';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { updateDeckInformation } from '../../lib/decks/updateDeckInformation.ts';
import { generateDeckThumbnail } from '../../lib/decks/generateDeckThumbnail.ts';

export const deckPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckCreateRequest),
  async c => {
    const user = c.get('user');
    const data = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const newDeck = await db
      .insert(deckTable)
      .values({
        userId: user.id,
        ...data,
        description: data.description ?? '',
      })
      .returning();

    const newDeckId = newDeck[0].id;
    if (newDeckId) await updateDeckInformation(newDeckId);

    // Generate deck thumbnail if leader and base cards are set
    if (newDeck[0].leaderCardId1 && newDeck[0].baseCardId) {
      try {
        await generateDeckThumbnail(newDeck[0].leaderCardId1, newDeck[0].baseCardId);
      } catch (error) {
        console.error('Error generating deck thumbnail:', error);
        // Don't fail the request if thumbnail generation fails
      }
    }

    return c.json({ data: newDeck }, 201);
  },
);
