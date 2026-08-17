import { and, asc, eq, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { deck as deckTable, type Deck } from '../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../db/schema/deck_card.ts';
import {
  deckVersion as deckVersionTable,
  deckVersionCard as deckVersionCardTable,
  type DeckVersion,
} from '../../db/schema/deck_version.ts';
import { DeckVersionError } from './deckVersionErrors.ts';
import {
  applyDeckVersionDelta,
  deckMetadataFromRow,
  normalizeVersionDecklist,
  type VersionedDeckCard,
  type VersionedDeckMetadata,
} from './versionedDeckState.ts';

// Both the top-level Drizzle client and a transaction expose the methods used here.
// Keeping the executor structural avoids coupling the deck domain to a driver transaction type.
export type DeckDbExecutor = any;

export type ReconstructedDeckVersion = {
  version: DeckVersion;
  metadata: VersionedDeckMetadata;
  cards: VersionedDeckCard[];
};

export async function lockDeck(executor: DeckDbExecutor, deckId: string): Promise<void> {
  await executor.execute(sql`SELECT id FROM deck WHERE id = ${deckId} FOR UPDATE`);
}

export async function loadDeck(
  executor: DeckDbExecutor,
  deckId: string,
): Promise<Deck | undefined> {
  return (await executor.select().from(deckTable).where(eq(deckTable.id, deckId)).limit(1))[0] as
    | Deck
    | undefined;
}

export async function loadCurrentVersionedCards(
  executor: DeckDbExecutor,
  deckId: string,
): Promise<VersionedDeckCard[]> {
  const rows = await executor
    .select({
      cardId: deckCardTable.cardId,
      board: deckCardTable.board,
      note: deckCardTable.note,
      quantity: deckCardTable.quantity,
    })
    .from(deckCardTable)
    .where(and(eq(deckCardTable.deckId, deckId), inArray(deckCardTable.board, [1, 2])));
  return normalizeVersionDecklist(rows);
}

export async function loadOrderedDeckVersions(
  executor: DeckDbExecutor,
  deckId: string,
): Promise<DeckVersion[]> {
  return (await executor
    .select()
    .from(deckVersionTable)
    .where(eq(deckVersionTable.deckId, deckId))
    .orderBy(asc(deckVersionTable.versionNumber))) as DeckVersion[];
}

export async function reconstructDeckVersion(
  executor: DeckDbExecutor,
  deckId: string,
  targetVersionNumber: number,
): Promise<ReconstructedDeckVersion> {
  const versions = (await executor
    .select()
    .from(deckVersionTable)
    .where(
      and(
        eq(deckVersionTable.deckId, deckId),
        lte(deckVersionTable.versionNumber, targetVersionNumber),
        isNotNull(deckVersionTable.sealedAt),
      ),
    )
    .orderBy(asc(deckVersionTable.versionNumber))) as DeckVersion[];

  const target = versions.find(version => version.versionNumber === targetVersionNumber);
  if (!target) {
    throw new DeckVersionError(
      'The requested sealed deck version does not exist',
      'VERSION_NOT_FOUND',
    );
  }
  if (versions[0]?.versionNumber !== 1) {
    throw new DeckVersionError(
      'Deck version history has no sealed v1 checkpoint',
      'INVALID_VERSION_HISTORY',
    );
  }

  const versionById = new Map(versions.map(version => [version.id, version.versionNumber]));
  const rows = versions.length
    ? await executor
        .select()
        .from(deckVersionCardTable)
        .where(
          inArray(
            deckVersionCardTable.deckVersionId,
            versions.map(version => version.id),
          ),
        )
    : [];

  const rowsByVersion = new Map<number, VersionedDeckCard[]>();
  for (const row of rows) {
    if (row.board !== 1 && row.board !== 2) {
      throw new DeckVersionError(
        'Deck version history contains a maybeboard row',
        'INVALID_VERSION_HISTORY',
      );
    }
    const versionNumber = versionById.get(row.deckVersionId);
    if (!versionNumber) {
      throw new DeckVersionError(
        'Deck version card points outside its loaded history',
        'INVALID_VERSION_HISTORY',
      );
    }
    const versionRows = rowsByVersion.get(versionNumber) ?? [];
    versionRows.push({
      cardId: row.cardId,
      board: row.board,
      note: row.note,
      quantity: row.quantity,
    });
    rowsByVersion.set(versionNumber, versionRows);
  }

  let cards: VersionedDeckCard[] = [];
  for (const version of versions) {
    cards = applyDeckVersionDelta(cards, rowsByVersion.get(version.versionNumber) ?? []);
  }

  return {
    version: target,
    metadata: deckMetadataFromRow(target),
    cards,
  };
}
