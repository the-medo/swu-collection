import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../db';
import { deckCard as deckCardTable, type DeckCard } from '../../db/schema/deck_card.ts';
import { user as userTable } from '../../db/schema/auth-schema.ts';
import { userDeckFavorite } from '../../db/schema/user_deck_favorite.ts';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import type { DeckData } from '../../../types/Deck.ts';
import { resolveDeckReference } from '../../lib/decks/resolveDeckReference.ts';
import { canReadDeck, getDeckPermissions } from '../../lib/decks/getDeckPermissions.ts';
import {
  loadCurrentVersionedCards,
  reconstructDeckVersion,
} from '../../lib/decks/deckVersionRepository.ts';

export interface DecksBulkResponse {
  decks: Record<string, DeckData | undefined>;
  cards: Record<string, DeckCard[]>;
}

const zBulkDecksQueryParams = z.object({
  ids: z
    .string()
    .transform(value => value.split(','))
    .pipe(z.array(z.guid()))
    .refine(ids => ids.length > 0, { message: 'At least one deck ID must be provided' }),
});

export const decksBulkGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zBulkDecksQueryParams),
  async c => {
    const { ids } = c.req.valid('query');
    const user = c.get('user');
    const isAdmin = user
      ? (
          await auth.api.userHasPermission({
            body: { userId: user.id, permission: { admin: ['access'] } },
          })
        ).success
      : false;
    const result: DecksBulkResponse = { decks: {}, cards: {} };

    for (const requestedId of ids) {
      const resolved = await resolveDeckReference(requestedId);
      if (!resolved) continue;
      const permissions = await getDeckPermissions(
        resolved.deck,
        user?.id ?? null,
        isAdmin,
        resolved.reference.kind,
      );
      if (!canReadDeck(resolved.deck, permissions)) continue;

      const owner = (
        await db.select().from(userTable).where(eq(userTable.id, resolved.deck.userId)).limit(1)
      )[0];
      const favorite = user
        ? ((
            await db
              .select({ createdAt: userDeckFavorite.createdAt })
              .from(userDeckFavorite)
              .where(
                and(
                  eq(userDeckFavorite.userId, user.id),
                  eq(userDeckFavorite.deckId, resolved.deck.id),
                ),
              )
              .limit(1)
          )[0]?.createdAt ?? null)
        : null;
      const effectiveDeck = resolved.version?.sealedAt
        ? {
            ...resolved.deck,
            name: resolved.version.name ?? resolved.deck.name,
            description: resolved.version.description ?? '',
            format: resolved.version.format ?? resolved.deck.format,
            leaderCardId1: resolved.version.leaderCardId1,
            leaderCardId2: resolved.version.leaderCardId2,
            baseCardId: resolved.version.baseCardId,
            updatedAt: resolved.version.sourceDeckUpdatedAt ?? resolved.version.sealedAt,
          }
        : resolved.deck;
      result.decks[requestedId] = {
        deck: effectiveDeck as unknown as DeckData['deck'],
        user: owner as unknown as DeckData['user'],
        isFavorite: favorite?.toISOString?.() ?? (favorite as unknown as string | null),
        reference: resolved.reference,
        permissions,
      };

      if (resolved.version) {
        const cards = resolved.version.sealedAt
          ? (await reconstructDeckVersion(db, resolved.deck.id, resolved.version.versionNumber))
              .cards
          : await loadCurrentVersionedCards(db, resolved.deck.id);
        result.cards[requestedId] = cards.map(card => ({
          deckId: resolved.deck.id,
          ...card,
        }));
      } else {
        result.cards[requestedId] = await db
          .select()
          .from(deckCardTable)
          .where(eq(deckCardTable.deckId, resolved.deck.id));
      }
    }

    return c.json(result);
  },
);
