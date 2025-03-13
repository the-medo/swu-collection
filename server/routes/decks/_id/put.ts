import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckUpdateRequest } from '../../../../types/ZDeck.ts';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { db } from '../../../db';
import { updateDeckInformation } from '../../../lib/decks/updateDeckInformation.ts';

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

    return c.json({ data: updatedDeck });
  },
);
