import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import { buildDeckMetadata } from './metadata.ts';
import { assertDeckTextAllowed } from '../moderation/content.ts';
import { generateDeckThumbnail } from './generateDeckThumbnail.ts';
import { runInBackground } from '../utils/backgroundProcess.ts';
import type { ValidatedDeckFromListRequest } from '../../../types/DeckFromList.ts';
import { Visibility, visibilityToPublicMap } from '../../../shared/types/visibility.ts';

export class InvalidDecklistError extends Error {}

export async function createDeckFromList(userId: string, input: ValidatedDeckFromListRequest) {
  assertDeckTextAllowed({ name: input.name });
  const catalog = await getMergedCardList();
  for (const leader of [input.leaderCardId, input.leaderCardId2].filter(Boolean)) {
    if (catalog[leader!]?.type !== 'Leader')
      throw new InvalidDecklistError('Choose a valid leader.');
  }
  if (catalog[input.baseCardId]?.type !== 'Base')
    throw new InvalidDecklistError('Choose a valid base.');

  const rows: { cardId: string; board: number; quantity: number }[] = [];
  for (const [cardId, boards] of Object.entries(input.cards)) {
    const card = catalog[cardId];
    if (!card || !['Unit', 'Event', 'Upgrade'].includes(card.type)) {
      throw new InvalidDecklistError(`Unknown or non-deck card: ${cardId}`);
    }
    for (const [board, quantity] of Object.entries(boards)) {
      // Zero counts remove a card from the submitted list; never persist zero rows.
      if (quantity && quantity > 0) rows.push({ cardId, board: Number(board), quantity });
    }
  }

  const created = await db.transaction(async tx => {
    const [createdDeck] = await tx
      .insert(deck)
      .values({
        userId,
        name: input.name,
        format: input.format,
        public: visibilityToPublicMap[Visibility.Unlisted],
        leaderCardId1: input.leaderCardId,
        leaderCardId2: input.leaderCardId2 ?? null,
        baseCardId: input.baseCardId,
      })
      .returning();
    if (!createdDeck) throw new Error('Failed to create deck.');
    if (rows.length)
      await tx.insert(deckCard).values(rows.map(row => ({ ...row, deckId: createdDeck.id })));
    await tx
      .insert(deckInformation)
      .values({ deckId: createdDeck.id, ...buildDeckMetadata(createdDeck, catalog) });
    return createdDeck;
  });

  // Thumbnails are optional in local development and never hold up creation.
  if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    runInBackground(generateDeckThumbnail, input.leaderCardId, input.baseCardId);
  }
  return created;
}
