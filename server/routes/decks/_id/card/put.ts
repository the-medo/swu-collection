import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckCardUpdateRequest } from '../../../../../types/ZDeckCard.ts';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { db } from '../../../../db';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { getDeckPermissions } from '../../../../lib/decks/getDeckPermissions.ts';
import { loadDeck, lockDeck } from '../../../../lib/decks/deckVersionRepository.ts';

export const deckIdCardPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zDeckCardUpdateRequest),
  async c => {
    const paramDeckId = z.guid().parse(c.req.param('id'));
    const { id, data } = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isAdmin = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          admin: ['access'],
        },
      },
    });

    const result = await db.transaction(async tx => {
      await lockDeck(tx, paramDeckId);
      const parent = await loadDeck(tx, paramDeckId);
      if (!parent) return null;
      const permissions = await getDeckPermissions(parent, user.id, isAdmin.success, 'parent', tx);
      if (!permissions.canEditContent) return false;

      const primaryKeyFilters = [
        eq(deckCardTable.deckId, paramDeckId),
        eq(deckCardTable.cardId, id.cardId),
        eq(deckCardTable.board, id.board),
      ];
      const [updatedDeckCard] = await tx
        .insert(deckCardTable)
        .values({
          deckId: paramDeckId,
          cardId: id.cardId,
          board: id.board,
          note: data.note ?? '',
          quantity: data.quantity ?? 0,
        })
        .onConflictDoUpdate({
          target: [deckCardTable.deckId, deckCardTable.cardId, deckCardTable.board],
          set: { ...data, note: data.note ?? undefined },
        })
        .returning();

      const card =
        updatedDeckCard.quantity === 0
          ? (
              await tx
                .delete(deckCardTable)
                .where(and(...primaryKeyFilters))
                .returning()
            )[0]
          : updatedDeckCard;
      const [updatedDeck] = await tx
        .update(deckTable)
        .set({ updatedAt: sql`NOW()` })
        .where(eq(deckTable.id, paramDeckId))
        .returning({ updatedAt: deckTable.updatedAt });
      return { card, updatedAt: updatedDeck.updatedAt };
    });

    if (result === null) return c.json({ message: "Deck doesn't exist" }, 404);
    if (result === false) return c.json({ message: 'Unauthorized' }, 403);
    return c.json({ data: result.card, deckUpdatedAt: result.updatedAt }, 201);
  },
);
