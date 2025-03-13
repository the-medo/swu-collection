import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { cardList } from '../../db/lists.ts';
import { SwuAspect } from '../../../types/enums.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';

/**
 * Updates the deck_information table with aspect counts and other metadata
 * Should be called after deck creation or update
 */
export async function updateDeckInformation(deckId: string) {
  const deckData = (await db.select().from(deck).where(eq(deck.id, deckId)))[0];
  if (!deckData) return;

  // Get card data from the in-memory store
  const leader1 = deckData.leaderCardId1 ? cardList[deckData.leaderCardId1] : null;
  const leader2 = deckData.leaderCardId2 ? cardList[deckData.leaderCardId2] : null;
  const baseCard = deckData.baseCardId ? cardList[deckData.baseCardId] : null;

  // Initialize aspect counts
  const aspectCounts = {
    [SwuAspect.COMMAND]: 0,
    [SwuAspect.VIGILANCE]: 0,
    [SwuAspect.AGGRESSION]: 0,
    [SwuAspect.CUNNING]: 0,
    [SwuAspect.HEROISM]: 0,
    [SwuAspect.VILLAINY]: 0,
  };

  // Process leader1 aspects
  if (leader1 && leader1.aspects) {
    leader1.aspects.forEach(aspect => aspectCounts[aspect]++);
  }

  // Process leader2 aspects
  if (leader2 && leader2.aspects) {
    leader2.aspects.forEach(aspect => aspectCounts[aspect]++);
  }

  // Process base aspects and determine base aspect
  let baseAspect = null;
  if (baseCard && baseCard.aspects && baseCard.aspects.length > 0) {
    baseAspect = baseCard.aspects[0];
    aspectCounts[baseAspect]++;
  }

  // Insert or update the deck information
  await db
    .insert(deckInformation)
    .values({
      deckId: deckData.id,
      aspectCommand: aspectCounts[SwuAspect.COMMAND],
      aspectVigilance: aspectCounts[SwuAspect.VIGILANCE],
      aspectAggression: aspectCounts[SwuAspect.AGGRESSION],
      aspectCunning: aspectCounts[SwuAspect.CUNNING],
      aspectHeroism: aspectCounts[SwuAspect.HEROISM],
      aspectVillainy: aspectCounts[SwuAspect.VILLAINY],
      baseAspect,
      favoritesCount: 0,
      commentsCount: 0,
      score: 0,
    })
    .onConflictDoUpdate({
      target: [deckInformation.deckId],
      set: {
        aspectCommand: aspectCounts[SwuAspect.COMMAND],
        aspectVigilance: aspectCounts[SwuAspect.VIGILANCE],
        aspectAggression: aspectCounts[SwuAspect.AGGRESSION],
        aspectCunning: aspectCounts[SwuAspect.CUNNING],
        aspectHeroism: aspectCounts[SwuAspect.HEROISM],
        aspectVillainy: aspectCounts[SwuAspect.VILLAINY],
        baseAspect,
        // Don't update counts here to avoid resetting them
      },
    });
}
