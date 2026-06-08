import { and, eq, gte, inArray, or } from 'drizzle-orm';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user as userTable } from '../../db/schema/auth-schema.ts';
import { cardPoolCards } from '../../db/schema/card_pool.ts';
import { cardPoolDeckCards } from '../../db/schema/card_pool_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import {
  deckCardVariant,
  deckCardVariantUserDefault,
  type DeckCardVariant,
  type DeckCardVariantUserDefault,
} from '../../db/schema/deck_card_variant.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import type {
  DeckCardVariantDefaultsMap,
  DeckCardVariantMaps,
} from '../../../types/DeckCardVariant.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';

const SWUBASE_USER_NAME = 'swubase';

type AuthUser = NonNullable<AuthExtension['Variables']['user']>;
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | DbTransaction;

type DeckVariantOwner = {
  deck: {
    id: string;
    userId: string;
    cardPoolId: string | null;
    leaderCardId1: string | null;
    leaderCardId2: string | null;
    baseCardId: string | null;
    public: number;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
};

export class DeckCardVariantError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'DeckCardVariantError';
  }
}

export async function getDeckVariantOwner(
  deckId: string,
  viewerUser?: AuthExtension['Variables']['user'],
): Promise<DeckVariantOwner> {
  const isPublicOrUnlisted = gte(deck.public, 1);
  const isOwner = viewerUser ? eq(deck.userId, viewerUser.id) : null;

  const [deckData] = await db
    .select({
      deck: {
        id: deck.id,
        userId: deck.userId,
        cardPoolId: deck.cardPoolId,
        leaderCardId1: deck.leaderCardId1,
        leaderCardId2: deck.leaderCardId2,
        baseCardId: deck.baseCardId,
        public: deck.public,
      },
      user: {
        id: userTable.id,
        name: userTable.name,
        displayName: userTable.displayName,
      },
    })
    .from(deck)
    .innerJoin(userTable, eq(deck.userId, userTable.id))
    .where(and(eq(deck.id, deckId), isOwner ? or(isOwner, isPublicOrUnlisted) : isPublicOrUnlisted))
    .limit(1);

  if (!deckData) {
    throw new DeckCardVariantError(404, "Deck doesn't exist or you don't have access to it");
  }

  return deckData;
}

export async function getDeckCardVariantMaps(
  deckId: string,
  viewerUser?: AuthExtension['Variables']['user'],
): Promise<DeckCardVariantMaps> {
  const deckData = await getDeckVariantOwner(deckId, viewerUser);
  const emptyMaps = createEmptyVariantMaps();

  if (isSwubaseUser(deckData.user)) {
    return emptyMaps;
  }

  const cardIds = await getDeckDisplayCardIds(deckData.deck);
  if (cardIds.length === 0) {
    return emptyMaps;
  }

  const [deckOverrideRows, showEverywhereRows, cardList] = await Promise.all([
    db
      .select()
      .from(deckCardVariant)
      .where(and(eq(deckCardVariant.deckId, deckId), inArray(deckCardVariant.cardId, cardIds))),
    db
      .select()
      .from(deckCardVariantUserDefault)
      .where(
        and(
          eq(deckCardVariantUserDefault.userId, deckData.user.id),
          eq(deckCardVariantUserDefault.showEverywhere, true),
          inArray(deckCardVariantUserDefault.cardId, cardIds),
        ),
      ),
    getMergedCardList(),
  ]);

  const deckOverrides = buildValidVariantMap(deckOverrideRows, cardList);
  const showEverywhereDefaults = buildValidVariantMap(showEverywhereRows, cardList);

  return {
    deckOverrides,
    showEverywhereDefaults,
    cardVariants: {
      ...showEverywhereDefaults,
      ...deckOverrides,
    },
  };
}

export async function assertCardVariantExists(
  cardId: string,
  variantId: string,
  cardList?: CardList,
): Promise<void> {
  const cards = cardList ?? (await getMergedCardList());
  const card = cards[cardId];

  if (!card) {
    throw new DeckCardVariantError(400, `Card ${cardId} was not found`);
  }

  if (!card.variants[variantId]) {
    throw new DeckCardVariantError(400, `Variant ${variantId} was not found for card ${cardId}`);
  }
}

export async function setDeckCardVariant(
  deckId: string,
  cardId: string,
  variantId: string,
  user: AuthExtension['Variables']['user'],
): Promise<DeckCardVariant> {
  const authenticatedUser = requireUser(user);
  await assertCanMutateDeckVariants(deckId, authenticatedUser);
  await assertCardVariantExists(cardId, variantId);
  await assertDeckDisplaysCard(deckId, cardId);

  const [savedVariant] = await db
    .insert(deckCardVariant)
    .values({
      deckId,
      cardId,
      variantId,
    })
    .onConflictDoUpdate({
      target: [deckCardVariant.deckId, deckCardVariant.cardId],
      set: {
        variantId,
        updatedAt: new Date().toISOString(),
      },
    })
    .returning();

  if (!savedVariant) {
    throw new DeckCardVariantError(500, 'Failed to save deck card variant');
  }

  return savedVariant;
}

export async function clearDeckCardVariant(
  deckId: string,
  cardId: string,
  user: AuthExtension['Variables']['user'],
): Promise<DeckCardVariant | undefined> {
  const authenticatedUser = requireUser(user);
  await assertCanMutateDeckVariants(deckId, authenticatedUser);

  const [deletedVariant] = await db
    .delete(deckCardVariant)
    .where(and(eq(deckCardVariant.deckId, deckId), eq(deckCardVariant.cardId, cardId)))
    .returning();

  return deletedVariant;
}

export async function getDeckCardVariantUserDefaults(
  userId: string,
): Promise<DeckCardVariantDefaultsMap> {
  const rows = await db
    .select()
    .from(deckCardVariantUserDefault)
    .where(eq(deckCardVariantUserDefault.userId, userId));

  const cardList = await getMergedCardList();
  const defaults: DeckCardVariantDefaultsMap = {};

  rows.forEach(row => {
    if (!isValidCardVariant(row.cardId, row.variantId, cardList)) return;
    defaults[row.cardId] = {
      variantId: row.variantId,
      showEverywhere: row.showEverywhere,
    };
  });

  return defaults;
}

export async function setDeckCardVariantUserDefault(
  userId: string,
  cardId: string,
  variantId: string,
  showEverywhere: boolean,
): Promise<DeckCardVariantUserDefault> {
  await assertCardVariantExists(cardId, variantId);

  const [savedDefault] = await db
    .insert(deckCardVariantUserDefault)
    .values({
      userId,
      cardId,
      variantId,
      showEverywhere,
    })
    .onConflictDoUpdate({
      target: [deckCardVariantUserDefault.userId, deckCardVariantUserDefault.cardId],
      set: {
        variantId,
        showEverywhere,
        updatedAt: new Date().toISOString(),
      },
    })
    .returning();

  if (!savedDefault) {
    throw new DeckCardVariantError(500, 'Failed to save deck card variant default');
  }

  return savedDefault;
}

export async function deleteDeckCardVariantUserDefault(
  userId: string,
  cardId: string,
): Promise<DeckCardVariantUserDefault | undefined> {
  const [deletedDefault] = await db
    .delete(deckCardVariantUserDefault)
    .where(
      and(
        eq(deckCardVariantUserDefault.userId, userId),
        eq(deckCardVariantUserDefault.cardId, cardId),
      ),
    )
    .returning();

  return deletedDefault;
}

export async function seedDeckCardVariantFromUserDefault(
  client: DbClient,
  deckId: string,
  userId: string,
  cardId: string,
): Promise<DeckCardVariant | undefined> {
  const [userDefault] = await client
    .select()
    .from(deckCardVariantUserDefault)
    .where(
      and(
        eq(deckCardVariantUserDefault.userId, userId),
        eq(deckCardVariantUserDefault.cardId, cardId),
      ),
    )
    .limit(1);

  if (!userDefault) {
    return undefined;
  }

  const cardList = await getMergedCardList();
  if (!isValidCardVariant(cardId, userDefault.variantId, cardList)) {
    return undefined;
  }

  const [insertedVariant] = await client
    .insert(deckCardVariant)
    .values({
      deckId,
      cardId,
      variantId: userDefault.variantId,
    })
    .onConflictDoNothing({
      target: [deckCardVariant.deckId, deckCardVariant.cardId],
    })
    .returning();

  return insertedVariant;
}

export async function deleteDeckCardVariantIfCardUnused(
  client: DbClient,
  deckId: string,
  cardId: string,
): Promise<DeckCardVariant | undefined> {
  const remainingCards = await client
    .select({
      cardId: deckCard.cardId,
      quantity: deckCard.quantity,
    })
    .from(deckCard)
    .where(and(eq(deckCard.deckId, deckId), eq(deckCard.cardId, cardId)));

  if (remainingCards.some(row => row.quantity > 0)) {
    return undefined;
  }

  const [deletedVariant] = await client
    .delete(deckCardVariant)
    .where(and(eq(deckCardVariant.deckId, deckId), eq(deckCardVariant.cardId, cardId)))
    .returning();

  return deletedVariant;
}

export async function deleteDeckCardVariantsForDeck(
  client: DbClient,
  deckId: string,
): Promise<DeckCardVariant[]> {
  return client.delete(deckCardVariant).where(eq(deckCardVariant.deckId, deckId)).returning();
}

export async function copyDeckCardVariants(
  client: DbClient,
  sourceDeckId: string,
  targetDeckId: string,
): Promise<DeckCardVariant[]> {
  const sourceVariants = await client
    .select()
    .from(deckCardVariant)
    .where(eq(deckCardVariant.deckId, sourceDeckId));

  if (sourceVariants.length === 0) {
    return [];
  }

  return client
    .insert(deckCardVariant)
    .values(
      sourceVariants.map(row => ({
        deckId: targetDeckId,
        cardId: row.cardId,
        variantId: row.variantId,
      })),
    )
    .onConflictDoNothing({
      target: [deckCardVariant.deckId, deckCardVariant.cardId],
    })
    .returning();
}

function createEmptyVariantMaps(): DeckCardVariantMaps {
  return {
    deckOverrides: {},
    showEverywhereDefaults: {},
    cardVariants: {},
  };
}

function isSwubaseUser(user: DeckVariantOwner['user']): boolean {
  // Most imported default decks belong to the default swubase account. Check both fields
  // defensively because older auth/import paths have used these labels inconsistently.
  return user.name === SWUBASE_USER_NAME || user.displayName === SWUBASE_USER_NAME;
}

async function getDeckDisplayCardIds(deckData: DeckVariantOwner['deck']): Promise<string[]> {
  const cardIds = new Set<string>();

  addCardId(cardIds, deckData.leaderCardId1);
  addCardId(cardIds, deckData.leaderCardId2);
  addCardId(cardIds, deckData.baseCardId);

  if (!deckData.cardPoolId) {
    const deckCards = await db
      .select({
        cardId: deckCard.cardId,
        quantity: deckCard.quantity,
      })
      .from(deckCard)
      .where(eq(deckCard.deckId, deckData.id));

    deckCards.forEach(row => {
      if (row.quantity > 0) addCardId(cardIds, row.cardId);
    });

    return Array.from(cardIds);
  }

  const poolRows = await db
    .select({
      cardId: cardPoolCards.cardId,
    })
    .from(cardPoolDeckCards)
    .innerJoin(
      cardPoolCards,
      and(
        eq(cardPoolCards.cardPoolId, deckData.cardPoolId),
        eq(cardPoolCards.cardPoolNumber, cardPoolDeckCards.cardPoolNumber),
      ),
    )
    .where(eq(cardPoolDeckCards.deckId, deckData.id));

  poolRows.forEach(row => addCardId(cardIds, row.cardId));

  return Array.from(cardIds);
}

async function assertCanMutateDeckVariants(deckId: string, user: AuthUser): Promise<void> {
  const [deckData] = await db
    .select({
      userId: deck.userId,
    })
    .from(deck)
    .where(eq(deck.id, deckId))
    .limit(1);

  if (!deckData) {
    throw new DeckCardVariantError(404, "Deck doesn't exist");
  }

  if (deckData.userId === user.id) {
    return;
  }

  const isAdmin = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permission: {
        admin: ['access'],
      },
    },
  });

  if (!isAdmin.success) {
    throw new DeckCardVariantError(403, 'Forbidden');
  }
}

async function assertDeckDisplaysCard(deckId: string, cardId: string): Promise<void> {
  const [deckData] = await db
    .select({
      id: deck.id,
      cardPoolId: deck.cardPoolId,
      leaderCardId1: deck.leaderCardId1,
      leaderCardId2: deck.leaderCardId2,
      baseCardId: deck.baseCardId,
      userId: deck.userId,
      public: deck.public,
    })
    .from(deck)
    .where(eq(deck.id, deckId))
    .limit(1);

  if (!deckData) {
    throw new DeckCardVariantError(404, "Deck doesn't exist");
  }

  const cardIds = await getDeckDisplayCardIds(deckData);
  if (!cardIds.includes(cardId)) {
    throw new DeckCardVariantError(400, `Card ${cardId} is not in this deck`);
  }
}

function buildValidVariantMap(
  rows: Array<Pick<DeckCardVariant | DeckCardVariantUserDefault, 'cardId' | 'variantId'>>,
  cardList: CardList,
): Record<string, string> {
  const variantMap: Record<string, string> = {};

  rows.forEach(row => {
    if (isValidCardVariant(row.cardId, row.variantId, cardList)) {
      variantMap[row.cardId] = row.variantId;
    }
  });

  return variantMap;
}

function isValidCardVariant(cardId: string, variantId: string, cardList: CardList): boolean {
  return !!cardList[cardId]?.variants[variantId];
}

function addCardId(cardIds: Set<string>, cardId: string | null | undefined): void {
  if (cardId) cardIds.add(cardId);
}

function requireUser(user: AuthExtension['Variables']['user']): AuthUser {
  if (!user) {
    throw new DeckCardVariantError(401, 'Unauthorized');
  }

  return user;
}
