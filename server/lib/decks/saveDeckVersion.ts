import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { deck as deckTable } from '../../db/schema/deck.ts';
import {
  deckVersion as deckVersionTable,
  deckVersionCard as deckVersionCardTable,
  type DeckVersion,
} from '../../db/schema/deck_version.ts';
import type { DeckVersionSummary } from '../../../types/Deck.ts';
import { DeckVersionError } from './deckVersionErrors.ts';
import { getDeckPermissions } from './getDeckPermissions.ts';
import { initializeDeckVersionsInTransaction } from './initializeDeckVersions.ts';
import {
  loadCurrentVersionedCards,
  loadDeck,
  loadOrderedDeckVersions,
  lockDeck,
  reconstructDeckVersion,
} from './deckVersionRepository.ts';
import {
  createDeckVersionDelta,
  deckMetadataFromRow,
  hashVersionedDeckState,
  playableDeckStatesEqual,
  summarizeDeckVersionDelta,
  versionedDeckStatesEqual,
} from './versionedDeckState.ts';

export type SaveDeckVersionParams = {
  deckId: string;
  actorId: string;
  isAdmin?: boolean;
  changeNote?: string;
  expectedUpdatedAt?: string;
};

export type SaveDeckVersionResult = {
  sealedVersion: DeckVersionSummary;
  openVersion: DeckVersion;
};

export async function saveDeckVersion({
  deckId,
  actorId,
  isAdmin = false,
  changeNote,
  expectedUpdatedAt,
}: SaveDeckVersionParams): Promise<SaveDeckVersionResult> {
  return db.transaction(async tx => {
    await lockDeck(tx, deckId);
    const parent = await loadDeck(tx, deckId);
    if (!parent) throw new DeckVersionError("Deck doesn't exist", 'DECK_NOT_FOUND');

    const permissions = await getDeckPermissions(parent, actorId, isAdmin, 'parent', tx);
    if (!permissions.canSaveVersion) {
      throw new DeckVersionError(
        'You do not have permission to save this deck version',
        'DECK_NOT_FOUND',
      );
    }
    if (expectedUpdatedAt && parent.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) {
      throw new DeckVersionError('The deck changed since this page was loaded', 'STALE_DECK');
    }

    let versions = await loadOrderedDeckVersions(tx, deckId);
    if (versions.length === 0) {
      const initialized = await initializeDeckVersionsInTransaction(tx, deckId, actorId);
      if (changeNote) {
        await tx
          .update(deckVersionTable)
          .set({ changeNote })
          .where(eq(deckVersionTable.id, initialized.sealedVersion.id));
        initialized.sealedVersion.changeNote = changeNote;
      }
      const summary = summarizeDeckVersionDelta(initialized.currentCards, []);
      return {
        sealedVersion: {
          id: initialized.sealedVersion.id,
          deckId,
          versionNumber: 1,
          state: 'sealed',
          sealedByUserId: actorId,
          changeNote: initialized.sealedVersion.changeNote,
          createdAt: initialized.sealedVersion.createdAt.toISOString(),
          sealedAt: initialized.sealedVersion.sealedAt!.toISOString(),
          hasChanges: true,
          hasPlayableChanges: initialized.currentCards.length > 0,
          ...summary,
        },
        openVersion: initialized.openVersion,
      };
    }

    const openVersion = versions[versions.length - 1]!;
    const previousVersion = versions[versions.length - 2];
    if (openVersion.sealedAt || !previousVersion?.sealedAt) {
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
      throw new DeckVersionError(
        'The open deck version must not contain stored cards',
        'INVALID_VERSION_HISTORY',
      );
    }

    const previous = await reconstructDeckVersion(tx, deckId, previousVersion.versionNumber);
    const currentCards = await loadCurrentVersionedCards(tx, deckId);
    const currentMetadata = deckMetadataFromRow(parent);
    if (
      versionedDeckStatesEqual(currentMetadata, currentCards, previous.metadata, previous.cards)
    ) {
      throw new DeckVersionError('There are no changes to save', 'NO_VERSION_CHANGES');
    }

    const delta = createDeckVersionDelta(previous.cards, currentCards);
    if (delta.length) {
      await tx
        .insert(deckVersionCardTable)
        .values(delta.map(card => ({ deckVersionId: openVersion.id, ...card })));
    }

    const now = new Date();
    const [sealedVersion] = (await tx
      .update(deckVersionTable)
      .set({
        sealedByUserId: actorId,
        ...currentMetadata,
        changeNote: changeNote || null,
        contentHash: hashVersionedDeckState(currentMetadata, currentCards),
        sourceDeckUpdatedAt: parent.updatedAt,
        sealedAt: now,
      })
      .where(and(eq(deckVersionTable.id, openVersion.id), isNull(deckVersionTable.sealedAt)))
      .returning()) as DeckVersion[];
    if (!sealedVersion) {
      throw new DeckVersionError('The open deck version was already sealed', 'STALE_DECK');
    }

    const nextVersionNumber = openVersion.versionNumber + 1;
    const [newOpenVersion] = (await tx
      .insert(deckVersionTable)
      .values({ deckId, versionNumber: nextVersionNumber })
      .returning()) as DeckVersion[];
    await tx
      .update(deckTable)
      .set({ versionCount: nextVersionNumber })
      .where(eq(deckTable.id, deckId));

    return {
      sealedVersion: {
        id: sealedVersion.id,
        deckId,
        versionNumber: sealedVersion.versionNumber,
        state: 'sealed',
        sealedByUserId: actorId,
        changeNote: sealedVersion.changeNote,
        createdAt: sealedVersion.createdAt.toISOString(),
        sealedAt: sealedVersion.sealedAt!.toISOString(),
        hasChanges: true,
        hasPlayableChanges: !playableDeckStatesEqual(
          currentMetadata,
          currentCards,
          previous.metadata,
          previous.cards,
        ),
        ...summarizeDeckVersionDelta(delta, previous.cards),
      },
      openVersion: newOpenVersion,
    };
  });
}
