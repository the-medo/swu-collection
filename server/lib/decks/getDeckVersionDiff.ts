import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { deckVersionCard as deckVersionCardTable } from '../../db/schema/deck_version.ts';
import { DeckVersionError } from './deckVersionErrors.ts';
import {
  loadCurrentVersionedCards,
  loadDeck,
  loadOrderedDeckVersions,
  reconstructDeckVersion,
} from './deckVersionRepository.ts';
import {
  createDeckVersionDelta,
  deckMetadataFromRow,
  summarizeDeckVersionDelta,
  type VersionedDeckCard,
} from './versionedDeckState.ts';

export async function getDeckVersionDiff(deckId: string, versionId: string) {
  const parent = await loadDeck(db, deckId);
  if (!parent) throw new DeckVersionError("Deck doesn't exist", 'DECK_NOT_FOUND');
  const versions = await loadOrderedDeckVersions(db, deckId);
  const version = versions.find(item => item.id === versionId);
  if (!version) {
    throw new DeckVersionError(
      'The requested version does not belong to this deck',
      'VERSION_NOT_FOUND',
    );
  }

  let cards: VersionedDeckCard[];
  if (!version.sealedAt) {
    const previous = versions[versions.length - 2];
    if (!previous?.sealedAt || version.id !== versions[versions.length - 1]?.id) {
      throw new DeckVersionError(
        'Deck version history has an invalid open head',
        'INVALID_VERSION_HISTORY',
      );
    }
    const previousState = await reconstructDeckVersion(db, deckId, previous.versionNumber);
    cards = createDeckVersionDelta(
      previousState.cards,
      await loadCurrentVersionedCards(db, deckId),
    );
  } else {
    const rows = await db
      .select()
      .from(deckVersionCardTable)
      .where(eq(deckVersionCardTable.deckVersionId, version.id));
    cards = rows.map(row => {
      if (row.board !== 1 && row.board !== 2) {
        throw new DeckVersionError(
          'Deck version contains a maybeboard row',
          'INVALID_VERSION_HISTORY',
        );
      }
      return { cardId: row.cardId, board: row.board, note: row.note, quantity: row.quantity };
    });
  }

  const previousCards =
    version.versionNumber === 1
      ? []
      : (await reconstructDeckVersion(db, deckId, version.versionNumber - 1)).cards;
  const previousMetadata =
    version.versionNumber === 1
      ? null
      : (await reconstructDeckVersion(db, deckId, version.versionNumber - 1)).metadata;
  const targetMetadata = version.sealedAt
    ? deckMetadataFromRow(version)
    : deckMetadataFromRow(parent);
  const previousQuantities = new Map(
    previousCards.map(card => [`${card.board}\u0000${card.cardId}`, card.quantity]),
  );
  const changes = cards.flatMap(card => {
    const quantityChange =
      card.quantity - (previousQuantities.get(`${card.board}\u0000${card.cardId}`) ?? 0);
    return quantityChange === 0 ? [] : [{ cardId: card.cardId, board: card.board, quantityChange }];
  });

  return {
    versionId: version.id,
    versionNumber: version.versionNumber,
    state: version.sealedAt ? ('sealed' as const) : ('open' as const),
    cards,
    changes,
    summary: summarizeDeckVersionDelta(cards, previousCards),
    metadata: {
      before: previousMetadata,
      after: targetMetadata,
    },
  };
}
