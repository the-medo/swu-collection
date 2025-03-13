import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckCreateRequest } from '../../../types/ZDeck.ts';
import { db } from '../../db';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { updateDeckInformation } from '../../lib/decks/updateDeckInformation.ts';

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

    return c.json({ data: newDeck }, 201);
  },
);
