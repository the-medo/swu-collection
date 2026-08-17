import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { deck as deckTable, type Deck } from '../../db/schema/deck.ts';
import {
  deckVersion as deckVersionTable,
  deckVersionCard as deckVersionCardTable,
  type DeckVersion,
} from '../../db/schema/deck_version.ts';
import { DeckVersionError } from './deckVersionErrors.ts';
import {
  loadCurrentVersionedCards,
  loadDeck,
  loadOrderedDeckVersions,
  lockDeck,
  type DeckDbExecutor,
} from './deckVersionRepository.ts';
import { hashVersionedDeckState, type VersionedDeckCard } from './versionedDeckState.ts';

export type InitializedDeckVersions = {
  deck: Deck;
  sealedVersion: DeckVersion;
  openVersion: DeckVersion;
  currentCards: VersionedDeckCard[];
  initialized: boolean;
};

export async function initializeDeckVersionsInTransaction(
  tx: DeckDbExecutor,
  deckId: string,
  actorId: string | null,
): Promise<InitializedDeckVersions> {
  await lockDeck(tx, deckId);
  const parent = await loadDeck(tx, deckId);
  if (!parent) throw new DeckVersionError("Deck doesn't exist", 'DECK_NOT_FOUND');
  if (parent.cardPoolId) {
    throw new DeckVersionError(
      'Deck versioning is not supported for limited/card-pool decks',
      'LIMITED_DECK_UNSUPPORTED',
    );
  }

  const existing = await loadOrderedDeckVersions(tx, deckId);
  if (existing.length > 0) {
    const openVersion = existing[existing.length - 1]!;
    const sealedVersion = existing[existing.length - 2];
    if (openVersion.sealedAt || !sealedVersion?.sealedAt) {
      throw new DeckVersionError(
        'Deck version history has an invalid open head',
        'INVALID_VERSION_HISTORY',
      );
    }
    return {
      deck: parent,
      sealedVersion,
      openVersion,
      currentCards: await loadCurrentVersionedCards(tx, deckId),
      initialized: false,
    };
  }

  const currentCards = await loadCurrentVersionedCards(tx, deckId);
  const metadata = {
    name: parent.name,
    description: parent.description,
    format: parent.format,
    leaderCardId1: parent.leaderCardId1,
    leaderCardId2: parent.leaderCardId2,
    baseCardId: parent.baseCardId,
  };
  const now = new Date();
  const [sealedVersion] = (await tx
    .insert(deckVersionTable)
    .values({
      deckId,
      versionNumber: 1,
      sealedByUserId: actorId,
      ...metadata,
      contentHash: hashVersionedDeckState(metadata, currentCards),
      sourceDeckUpdatedAt: parent.updatedAt,
      createdAt: now,
      sealedAt: now,
    })
    .returning()) as DeckVersion[];

  if (currentCards.length > 0) {
    await tx.insert(deckVersionCardTable).values(
      currentCards.map(card => ({
        deckVersionId: sealedVersion.id,
        ...card,
      })),
    );
  }

  const [openVersion] = (await tx
    .insert(deckVersionTable)
    .values({ deckId, versionNumber: 2 })
    .returning()) as DeckVersion[];

  const [updatedDeck] = (await tx
    .update(deckTable)
    .set({ versionCount: 2 })
    .where(eq(deckTable.id, deckId))
    .returning()) as Deck[];

  return {
    deck: updatedDeck,
    sealedVersion,
    openVersion,
    currentCards,
    initialized: true,
  };
}

export async function initializeDeckVersions(
  deckId: string,
  actorId: string | null = null,
): Promise<InitializedDeckVersions> {
  return db.transaction(tx => initializeDeckVersionsInTransaction(tx, deckId, actorId));
}
