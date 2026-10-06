import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { zDeckCreateRequest } from '../../../types/ZDeck.ts';
import { createDeckForUser } from '../../lib/decks/createDeck.ts';
import { DeckFolderNotFoundError } from '../../lib/decks/deckFolders.ts';
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

    let newDeck;
    try {
      newDeck = await createDeckForUser(user.id, data);
    } catch (error) {
      if (error instanceof DeckFolderNotFoundError) return c.json({ message: error.message }, 404);
      throw error;
    }

    // Generate deck thumbnail in the background if leader and base cards are set
    if (newDeck.leaderCardId1 && newDeck.baseCardId) {
      runInBackground(generateDeckThumbnail, newDeck.leaderCardId1, newDeck.baseCardId);
      console.log('Deck thumbnail generation started in background');
    }

    return c.json({ data: [newDeck] }, 201);
  },
);
