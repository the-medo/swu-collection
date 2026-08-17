import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { zDeckCardDeleteRequest } from '../../../../../types/ZDeckCard.ts';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { auth } from '../../../../auth/auth.ts';
import { sql } from 'drizzle-orm';
import { getDeckPermissions } from '../../../../lib/decks/getDeckPermissions.ts';
import { loadDeck, lockDeck } from '../../../../lib/decks/deckVersionRepository.ts';

export const deckIdCardDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('json', zDeckCardDeleteRequest),
  async c => {
    const paramDeckId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isAdmin = await auth.api.userHasPermission({
      body: { userId: user.id, permission: { admin: ['access'] } },
    });
    const result = await db.transaction(async tx => {
      await lockDeck(tx, paramDeckId);
      const parent = await loadDeck(tx, paramDeckId);
      if (!parent) return null;
      const permissions = await getDeckPermissions(parent, user.id, isAdmin.success, 'parent', tx);
      if (!permissions.canEditContent) return false;

      const [deletedDeckCard] = await tx
        .delete(deckCardTable)
        .where(
          and(
            eq(deckCardTable.deckId, paramDeckId),
            eq(deckCardTable.cardId, data.cardId),
            eq(deckCardTable.board, data.board),
          ),
        )
        .returning();
      const [updatedDeck] = await tx
        .update(deckTable)
        .set({ updatedAt: sql`NOW()` })
        .where(eq(deckTable.id, paramDeckId))
        .returning({ updatedAt: deckTable.updatedAt });
      return { card: deletedDeckCard, updatedAt: updatedDeck.updatedAt };
    });

    if (result === null) return c.json({ message: "Deck doesn't exist" }, 404);
    if (result === false) return c.json({ message: 'Unauthorized' }, 403);
    return c.json({ data: result.card, deckUpdatedAt: result.updatedAt });
  },
);
