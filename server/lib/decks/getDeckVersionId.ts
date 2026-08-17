import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  deckVersion as deckVersionTable,
  deckVersionCard as deckVersionCardTable,
} from '../../db/schema/deck_version.ts';
import type { ResolvedDeckVersion } from '../../../types/Deck.ts';
import { DeckVersionError } from './deckVersionErrors.ts';
import { initializeDeckVersionsInTransaction } from './initializeDeckVersions.ts';
import {
  loadCurrentVersionedCards,
  loadDeck,
  loadOrderedDeckVersions,
  lockDeck,
  reconstructDeckVersion,
} from './deckVersionRepository.ts';
import {
  deckMetadataFromRow,
  playableDeckStatesEqual,
  type VersionedDeckCard,
} from './versionedDeckState.ts';

export type GetDeckVersionIdParams = {
  deckId: string;
  deckVersionId?: string | null;
  actorId?: string | null;
};

const asDecklist = (deckId: string, cards: VersionedDeckCard[]) =>
  cards.map(card => ({ deckId, ...card }));

export async function getDeckVersionId({
  deckId,
  deckVersionId = null,
  actorId = null,
}: GetDeckVersionIdParams): Promise<ResolvedDeckVersion> {
  return db.transaction(async tx => {
    // Normal deck writes and version seals take this same row lock. Holding it here
    // keeps metadata, live cards, and the version head consistent during selection.
    await lockDeck(tx, deckId);
    let parent = await loadDeck(tx, deckId);
    if (!parent) throw new DeckVersionError("Deck doesn't exist", 'DECK_NOT_FOUND');
    if (parent.cardPoolId) {
      throw new DeckVersionError(
        'Deck versioning is not supported for limited/card-pool decks',
        'LIMITED_DECK_UNSUPPORTED',
      );
    }

    let versions = await loadOrderedDeckVersions(tx, deckId);
    if (versions.length === 0) {
      const initialized = await initializeDeckVersionsInTransaction(tx, deckId, actorId);
      parent = initialized.deck;
      versions = [initialized.sealedVersion, initialized.openVersion];
    }

    const currentCards = await loadCurrentVersionedCards(tx, deckId);
    const openVersion = versions[versions.length - 1];
    const latestSealed = versions[versions.length - 2];
    if (!openVersion || openVersion.sealedAt || !latestSealed?.sealedAt) {
      throw new DeckVersionError(
        'Deck version history has an invalid open head',
        'INVALID_VERSION_HISTORY',
      );
    }
    const openRows = await tx
      .select({ id: deckVersionCardTable.deckVersionId })
      .from(deckVersionCardTable)
      .where(eq(deckVersionCardTable.deckVersionId, openVersion.id))
      .limit(1);
    if (openRows.length) {
      throw new DeckVersionError('The open deck version must be empty', 'INVALID_VERSION_HISTORY');
    }

    if (deckVersionId) {
      const forced = (
        await tx
          .select()
          .from(deckVersionTable)
          .where(eq(deckVersionTable.id, deckVersionId))
          .limit(1)
      )[0];
      if (!forced) {
        throw new DeckVersionError(
          'The requested deck version does not exist',
          'VERSION_NOT_FOUND',
        );
      }
      if (forced.deckId !== deckId) {
        throw new DeckVersionError(
          'The requested deck version belongs to another deck',
          'VERSION_PARENT_MISMATCH',
        );
      }
      if (!forced.sealedAt) {
        if (forced.id !== openVersion.id) {
          throw new DeckVersionError(
            'Only the latest deck version may be open',
            'INVALID_VERSION_HISTORY',
          );
        }
        return { deckId, deckVersionId: forced.id, decklist: asDecklist(deckId, currentCards) };
      }
      const reconstructed = await reconstructDeckVersion(tx, deckId, forced.versionNumber);
      return {
        deckId,
        deckVersionId: forced.id,
        decklist: asDecklist(deckId, reconstructed.cards),
      };
    }

    const reconstructed = await reconstructDeckVersion(tx, deckId, latestSealed.versionNumber);
    const currentMetadata = deckMetadataFromRow(parent);
    const currentMatchesLatest = playableDeckStatesEqual(
      currentMetadata,
      currentCards,
      reconstructed.metadata,
      reconstructed.cards,
    );

    return currentMatchesLatest
      ? {
          deckId,
          deckVersionId: latestSealed.id,
          decklist: asDecklist(deckId, reconstructed.cards),
        }
      : {
          deckId,
          deckVersionId: openVersion.id,
          decklist: asDecklist(deckId, currentCards),
        };
  });
}
