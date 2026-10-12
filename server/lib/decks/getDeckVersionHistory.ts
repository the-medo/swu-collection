import type { DeckDbExecutor } from './deckVersionRepository.ts';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { deckVersionCard as deckVersionCardTable } from '../../db/schema/deck_version.ts';
import { user as userTable } from '../../db/schema/auth-schema.ts';
import type { DeckVersionSummary } from '../../../types/Deck.ts';
import { loadCurrentVersionedCards, loadOrderedDeckVersions } from './deckVersionRepository.ts';
import {
  applyDeckVersionDelta,
  createDeckVersionDelta,
  deckMetadataFromRow,
  playableDeckStatesEqual,
  summarizeDeckVersionDelta,
  versionedDeckStatesEqual,
  type VersionedDeckCard,
} from './versionedDeckState.ts';
import { DeckVersionError } from './deckVersionErrors.ts';
import { deck as deckTable } from '../../db/schema/deck.ts';

export async function getDeckVersionHistory(deckId: string): Promise<DeckVersionSummary[]> {
  return db.transaction(tx => readDeckVersionHistory(deckId, tx), {
    isolationLevel: 'repeatable read',
    accessMode: 'read only',
  });
}

async function readDeckVersionHistory(
  deckId: string,
  executor: DeckDbExecutor,
): Promise<DeckVersionSummary[]> {
  const versions = await loadOrderedDeckVersions(executor, deckId);
  if (versions.length === 0) {
    return [];
  }

  const parent = (
    await executor.select().from(deckTable).where(eq(deckTable.id, deckId)).limit(1)
  )[0];
  if (!parent) throw new DeckVersionError("Deck doesn't exist", 'DECK_NOT_FOUND');
  if (
    versions[0].versionNumber !== 1 ||
    !versions[0].sealedAt ||
    versions[versions.length - 1].sealedAt ||
    versions.filter(version => !version.sealedAt).length !== 1
  )
    throw new DeckVersionError(
      'Deck version history has an invalid open head',
      'INVALID_VERSION_HISTORY',
    );
  const currentCards = await loadCurrentVersionedCards(executor, deckId);
  const versionIds = versions.map(version => version.id);
  const rows = versionIds.length
    ? await executor
        .select()
        .from(deckVersionCardTable)
        .where(inArray(deckVersionCardTable.deckVersionId, versionIds))
    : [];
  const rowsByVersion = new Map<string, VersionedDeckCard[]>();
  for (const row of rows) {
    if (row.board !== 1 && row.board !== 2)
      throw new DeckVersionError(
        'Deck version history contains a maybeboard row',
        'INVALID_VERSION_HISTORY',
      );
    const list = rowsByVersion.get(row.deckVersionId) ?? [];
    list.push({ cardId: row.cardId, board: row.board, note: row.note, quantity: row.quantity });
    rowsByVersion.set(row.deckVersionId, list);
  }

  const sealerIds = versions.flatMap(version =>
    version.sealedByUserId ? [version.sealedByUserId] : [],
  );
  const sealers = sealerIds.length
    ? await executor
        .select({ id: userTable.id, name: userTable.displayName })
        .from(userTable)
        .where(inArray(userTable.id, sealerIds))
    : [];
  const sealerNames = new Map(sealers.map(sealer => [sealer.id, sealer.name]));

  const summaries: DeckVersionSummary[] = [];
  let previousCards: VersionedDeckCard[] = [];
  let previousMetadata: ReturnType<typeof deckMetadataFromRow> | null = null;
  for (const version of versions) {
    const isOpen = !version.sealedAt;
    const metadata = deckMetadataFromRow(isOpen ? parent : version);
    const delta = isOpen
      ? createDeckVersionDelta(previousCards, currentCards)
      : (rowsByVersion.get(version.id) ?? []);
    const cards = isOpen ? currentCards : applyDeckVersionDelta(previousCards, delta);
    summaries.push({
      id: version.id,
      deckId,
      versionNumber: version.versionNumber,
      state: isOpen ? 'open' : 'sealed',
      sealedByUserId: version.sealedByUserId,
      sealedByName: version.sealedByUserId ? sealerNames.get(version.sealedByUserId) : null,
      changeNote: version.changeNote,
      createdAt: version.createdAt.toISOString(),
      sealedAt: version.sealedAt?.toISOString() ?? null,
      hasChanges:
        !isOpen ||
        !previousMetadata ||
        !versionedDeckStatesEqual(metadata, cards, previousMetadata, previousCards),
      hasPlayableChanges:
        !previousMetadata ||
        !playableDeckStatesEqual(metadata, cards, previousMetadata, previousCards),
      ...summarizeDeckVersionDelta(delta, previousCards),
    });
    previousCards = cards;
    previousMetadata = metadata;
  }

  return summaries.sort((a, b) => b.versionNumber - a.versionNumber);
}
