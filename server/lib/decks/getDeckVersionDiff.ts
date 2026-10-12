import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { deckVersionCard as deckVersionCardTable } from '../../db/schema/deck_version.ts';
import { DeckVersionError } from './deckVersionErrors.ts';
import type { DeckVersionDiff } from '../../../types/Deck.ts';
import type { DeckDbExecutor } from './deckVersionRepository.ts';
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

export async function getDeckVersionDiff(
  deckId: string,
  versionId: string,
): Promise<DeckVersionDiff> {
  return db.transaction(tx => readDeckVersionDiff(tx, deckId, versionId), {
    isolationLevel: 'repeatable read',
    accessMode: 'read only',
  });
}

async function readDeckVersionDiff(
  executor: DeckDbExecutor,
  deckId: string,
  versionId: string,
): Promise<DeckVersionDiff> {
  const parent = await loadDeck(executor, deckId);
  if (!parent) throw new DeckVersionError("Deck doesn't exist", 'DECK_NOT_FOUND');
  const versions = await loadOrderedDeckVersions(executor, deckId);
  const version = versions.find(item => item.id === versionId);
  if (!version) {
    throw new DeckVersionError(
      'The requested version does not belong to this deck',
      'VERSION_NOT_FOUND',
    );
  }

  const previousState =
    version.versionNumber === 1
      ? null
      : await reconstructDeckVersion(executor, deckId, version.versionNumber - 1);
  const previousCards = previousState?.cards ?? [];
  const previousMetadata = previousState?.metadata ?? null;

  let cards: VersionedDeckCard[];
  if (!version.sealedAt) {
    const previous = versions[versions.length - 2];
    if (!previous?.sealedAt || version.id !== versions[versions.length - 1]?.id) {
      throw new DeckVersionError(
        'Deck version history has an invalid open head',
        'INVALID_VERSION_HISTORY',
      );
    }
    cards = createDeckVersionDelta(
      previousCards,
      await loadCurrentVersionedCards(executor, deckId),
    );
  } else {
    const rows = await executor
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
  const previousNotes = new Map(
    previousCards.map(card => [`${card.board}\u0000${card.cardId}`, card.note]),
  );
  const noteChanges = cards.flatMap(card => {
    const before = previousNotes.get(`${card.board}\u0000${card.cardId}`) ?? '';
    const after = card.quantity > 0 ? card.note : '';
    return before === after ? [] : [{ cardId: card.cardId, board: card.board, before, after }];
  });

  return {
    versionId: version.id,
    versionNumber: version.versionNumber,
    state: version.sealedAt ? ('sealed' as const) : ('open' as const),
    cards,
    changes,
    noteChanges,
    summary: summarizeDeckVersionDelta(cards, previousCards),
    metadata: {
      before: previousMetadata,
      after: targetMetadata,
    },
  };
}
