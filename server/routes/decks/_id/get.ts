import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { db } from '../../../db';
import { selectUser } from '../../user.ts';
import { user as userTable } from '../../../db/schema/auth-schema.ts';
import { selectDeck } from '../../deck.ts';
import { userDeckFavorite } from '../../../db/schema/user_deck_favorite.ts';
import { selectEntityPricesArrayFor } from '../../../lib/entity-prices/selectEntityPrices.ts';
import { auth, type AuthExtension } from '../../../auth/auth.ts';
import { resolveDeckReference } from '../../../lib/decks/resolveDeckReference.ts';
import { canReadDeck, getDeckPermissions } from '../../../lib/decks/getDeckPermissions.ts';

export const deckIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const referenceId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  const resolved = await resolveDeckReference(referenceId);
  if (!resolved) return c.json({ message: "Deck doesn't exist" }, 404);

  const isAdmin = user
    ? (
        await auth.api.userHasPermission({
          body: { userId: user.id, permission: { admin: ['access'] } },
        })
      ).success
    : false;
  const permissions = await getDeckPermissions(
    resolved.deck,
    user?.id ?? null,
    isAdmin,
    resolved.reference.kind,
  );
  if (!canReadDeck(resolved.deck, permissions)) {
    return c.json({ message: "Deck doesn't exist" }, 404);
  }

  let query = db
    .select({
      user: selectUser,
      deck: selectDeck,
      isFavorite: user ? userDeckFavorite.createdAt : sql.raw('NULL'),
      entityPrices: selectEntityPricesArrayFor(deckTable.id),
    })
    .from(deckTable)
    .innerJoin(userTable, eq(deckTable.userId, userTable.id))
    .$dynamic();
  if (user) {
    query = query.leftJoin(
      userDeckFavorite,
      and(eq(userDeckFavorite.userId, user.id), eq(userDeckFavorite.deckId, deckTable.id)),
    );
  }
  const deckData = (await query.where(eq(deckTable.id, resolved.deck.id)).limit(1))[0];
  if (!deckData) return c.json({ message: "Deck doesn't exist" }, 404);

  if (resolved.version?.sealedAt) {
    deckData.deck = {
      ...deckData.deck,
      name: resolved.version.name ?? deckData.deck.name,
      description: resolved.version.description ?? '',
      format: resolved.version.format ?? deckData.deck.format,
      leaderCardId1: resolved.version.leaderCardId1,
      leaderCardId2: resolved.version.leaderCardId2,
      baseCardId: resolved.version.baseCardId,
      updatedAt: resolved.version.sourceDeckUpdatedAt ?? resolved.version.sealedAt,
    };
  }

  return c.json({ ...deckData, reference: resolved.reference, permissions });
});
