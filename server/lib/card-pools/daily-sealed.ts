import { and, count, countDistinct, desc, eq, gte, inArray, isNull, lte, ne } from 'drizzle-orm';
import { z } from 'zod';
import { cardPoolInfo } from '../../../lib/swu-resources/card-pool-info.ts';
import { setInfo } from '../../../lib/swu-resources/set-info.ts';
import { CardPoolType } from '../../../shared/types/cardPools.ts';
import {
  DAILY_SEALED_BOOSTER_COUNT,
  dailySealedDateSchema,
  getDailySealedDate,
  type DailySealedResponse,
} from '../../../shared/types/dailySealed.ts';
import { Visibility } from '../../../shared/types/visibility.ts';
import { SwuSet } from '../../../types/enums.ts';
import { db } from '../../db';
import { cardList } from '../../db/lists.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { cardPoolCards, cardPools } from '../../db/schema/card_pool.ts';
import { cardPoolDeckCards } from '../../db/schema/card_pool_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import {
  filterLeadersFromCardPool,
  generateCardPool,
  transformCardPoolToCardPoolCards,
} from './generate-card-pool.ts';

export const DAILY_SEALED_USER_ID = 'swubase';

export function resolveDailySealedSet(date: string, requestedSet?: string): SwuSet {
  dailySealedDateSchema.parse(date);
  if (requestedSet !== undefined) {
    const set = z.enum(SwuSet).parse(requestedSet.trim().toLowerCase());
    if (!cardPoolInfo[set]) throw new Error(`Sealed pools are not supported for ${set}.`);
    if (setInfo[set].releaseDate > date)
      throw new Error(`${setInfo[set].name} has not been released on ${date}.`);
    return set;
  }

  const latest = (Object.keys(cardPoolInfo) as SwuSet[])
    .filter(set => setInfo[set].releaseDate <= date)
    .sort((a, b) => setInfo[b].releaseDate.localeCompare(setInfo[a].releaseDate))[0];
  if (!latest) throw new Error(`No supported released set is available for ${date}.`);
  return latest;
}

export async function generateDailySealedPool(options: { date?: string; set?: string } = {}) {
  const date = dailySealedDateSchema.parse(options.date ?? getDailySealedDate());
  const set = resolveDailySealedSet(date, options.set);

  return db.transaction(async tx => {
    const [existing] = await tx.select().from(cardPools).where(eq(cardPools.dailyDate, date));
    if (existing) return { created: false, pool: existing };

    const [owner] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, DAILY_SEALED_USER_ID));
    if (!owner) throw new Error('The seeded swubase user is required to create the daily pool.');

    const cards = generateCardPool(set, CardPoolType.Sealed, DAILY_SEALED_BOOSTER_COUNT);
    const leaders = filterLeadersFromCardPool(cards, cardList);
    if (cards.length !== 120 || leaders.length !== 8 || cards.some(id => !cardList[id]))
      throw new Error(`The ${set} catalog did not produce eight complete sealed packs.`);

    // The unique day claims the challenge across processes. Cards and the claim
    // commit together, so a crash can never publish a partially generated pool.
    const [pool] = await tx
      .insert(cardPools)
      .values({
        userId: DAILY_SEALED_USER_ID,
        dailyDate: date,
        set,
        type: CardPoolType.Sealed,
        name: `Daily sealed · ${date}`,
        description: `Eight packs of ${setInfo[set].name}. Build from the same pool as everyone else and make your deck public to share your approach.`,
        leaders: leaders.join(','),
        visibility: Visibility.Public,
        status: 'ready',
        custom: false,
        edited: false,
      })
      .onConflictDoNothing({ target: cardPools.dailyDate })
      .returning();

    if (!pool) {
      const [winner] = await tx.select().from(cardPools).where(eq(cardPools.dailyDate, date));
      if (!winner) throw new Error('The daily pool claim could not be read; retry the job.');
      return { created: false, pool: winner };
    }

    await tx.insert(cardPoolCards).values(transformCardPoolToCardPoolCards(cards, pool.id));
    return { created: true, pool };
  });
}

export async function getDailySealedPool(
  date?: string,
  now = new Date(),
): Promise<DailySealedResponse> {
  const today = getDailySealedDate(now);
  const selectedDate = date ?? today;
  dailySealedDateSchema.parse(selectedDate);
  const nextDay = new Date(`${selectedDate}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const visiblePool = and(
    eq(cardPools.userId, DAILY_SEALED_USER_ID),
    eq(cardPools.visibility, Visibility.Public),
    eq(cardPools.status, 'ready'),
    isNull(cardPools.archivedAt),
  );
  const [[pool], dates] = await Promise.all([
    db
      .select()
      .from(cardPools)
      .where(
        and(
          visiblePool,
          selectedDate === today
            ? lte(cardPools.dailyDate, today)
            : eq(cardPools.dailyDate, selectedDate),
        ),
      )
      .orderBy(desc(cardPools.dailyDate))
      .limit(1),
    db
      .select({ date: cardPools.dailyDate })
      .from(cardPools)
      .where(and(visiblePool, lte(cardPools.dailyDate, today)))
      .orderBy(desc(cardPools.dailyDate)),
  ]);
  const result: DailySealedResponse = {
    date: selectedDate,
    today,
    nextRefreshAt: nextDay.toISOString(),
    availableDates: dates.flatMap(({ date }) => (date ? [date] : [])),
    pool: null,
  };
  if (!pool?.dailyDate) return result;

  // This is a public homepage, even for signed-in viewers: do not include a
  // viewer's private/unlisted drafts in the gallery or its aggregate counts.
  const publicDecks = and(eq(deck.cardPoolId, pool.id), eq(deck.public, 1));
  const cards = await db
    .select({ cardId: cardPoolCards.cardId, number: cardPoolCards.cardPoolNumber })
    .from(cardPoolCards)
    .where(eq(cardPoolCards.cardPoolId, pool.id));
  // Count physical main-deck cards, not the full pool, sideboard, leader or base.
  const mainDeckNumbers = cards
    .filter(({ cardId }) => ['Unit', 'Upgrade', 'Event'].includes(cardList[cardId]?.type ?? ''))
    .map(card => card.number);
  const completedDecks = and(
    publicDecks,
    ne(deck.leaderCardId1, ''),
    ne(deck.baseCardId, ''),
    gte(
      db.$count(
        cardPoolDeckCards,
        and(
          eq(cardPoolDeckCards.deckId, deck.id),
          eq(cardPoolDeckCards.location, 'deck'),
          inArray(cardPoolDeckCards.cardPoolNumber, mainDeckNumbers),
        ),
      ),
      30,
    ),
  );
  const [decks, [totals]] = await Promise.all([
    db
      .select({
        id: deck.id,
        name: deck.name,
        leaderCardId: deck.leaderCardId1,
        baseCardId: deck.baseCardId,
        author: { id: user.id, displayName: user.displayName },
      })
      .from(deck)
      .innerJoin(user, eq(deck.userId, user.id))
      .where(completedDecks)
      .orderBy(desc(deck.createdAt), desc(deck.id))
      .limit(12),
    db
      .select({ decks: count(), builders: countDistinct(deck.userId) })
      .from(deck)
      .where(publicDecks),
  ]);
  const leaderCounts = new Map<string, number>();
  for (const cardId of (pool.leaders ?? '').split(',').filter(Boolean)) {
    leaderCounts.set(cardId, (leaderCounts.get(cardId) ?? 0) + 1);
  }

  return {
    ...result,
    pool: {
      id: pool.id,
      date: pool.dailyDate,
      name: pool.name ?? 'Daily sealed',
      set: z.enum(SwuSet).parse(pool.set),
      boosterCount: DAILY_SEALED_BOOSTER_COUNT,
      cardCount: cards.length,
      leaders: [...leaderCounts].map(([cardId, copies]) => ({ cardId, copies })),
      publicDeckCount: totals?.decks ?? 0,
      builderCount: totals?.builders ?? 0,
      decks,
    },
  };
}
