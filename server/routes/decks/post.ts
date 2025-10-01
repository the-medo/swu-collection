import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { zDeckCreateRequest } from '../../../types/ZDeck.ts';
import { db } from '../../db';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { updateDeckInformation } from '../../lib/decks/updateDeckInformation.ts';
import { generateDeckThumbnail } from '../../lib/decks/generateDeckThumbnail.ts';
import { runInBackground } from '../../lib/utils/backgroundProcess.ts';
import type { AuthExtension } from '../../auth/auth.ts';

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

    // Generate deck thumbnail in the background if leader and base cards are set
    if (newDeck[0].leaderCardId1 && newDeck[0].baseCardId) {
      runInBackground(generateDeckThumbnail, newDeck[0].leaderCardId1, newDeck[0].baseCardId);
      console.log('Deck thumbnail generation started in background');
    }

    return c.json({ data: newDeck }, 201);
  },
);
