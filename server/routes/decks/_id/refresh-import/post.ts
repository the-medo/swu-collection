import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckImportSource } from '../../../../db/schema/deck_import_source.ts';
import { getMergedCardList } from '../../../../lib/cards/cardListProvider.ts';
import {
  DeckBuilderError,
  getDeckBuilderForSource,
  parseImportedDeck,
} from '../../../../lib/decks/deckBuilders.ts';
import { refreshImportedDeckForUser } from '../../../../lib/decks/importDeck.ts';

const zDeckIdParams = z.object({ id: z.guid() });

export const deckIdRefreshImportPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('param', zDeckIdParams),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id: deckId } = c.req.valid('param');
    const importedDeck = (
      await db
        .select({ source: deckImportSource, cardPoolId: deckTable.cardPoolId })
        .from(deckImportSource)
        .innerJoin(deckTable, eq(deckTable.id, deckImportSource.deckId))
        .where(and(eq(deckImportSource.deckId, deckId), eq(deckTable.userId, user.id)))
    )[0];

    if (!importedDeck) return c.json({ message: 'Imported deck not found.' }, 404);
    if (importedDeck.cardPoolId) {
      return c.json({ message: 'Card-pool decks cannot be refreshed from an import source.' }, 409);
    }

    try {
      const builder = getDeckBuilderForSource(importedDeck.source.source);
      const sourceDeck = await builder.fetchDeck(importedDeck.source.sourceDeckId);
      const parsedDeck = parseImportedDeck(sourceDeck, await getMergedCardList());
      const refreshedDeck = await refreshImportedDeckForUser({
        deckId,
        userId: user.id,
        parsedDeck,
      });

      return c.json({ data: refreshedDeck });
    } catch (error) {
      if (error instanceof DeckBuilderError) {
        return c.json({ message: error.message }, error.status);
      }
      throw error;
    }
  },
);
