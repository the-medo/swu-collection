import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { deckVersionCard as deckVersionCardTable } from '../../db/schema/deck_version.ts';
import { user as userTable } from '../../db/schema/auth-schema.ts';
import type { DeckVersionSummary } from '../../../types/Deck.ts';
import {
  loadCurrentVersionedCards,
  loadOrderedDeckVersions,
  reconstructDeckVersion,
} from './deckVersionRepository.ts';
import {
  createDeckVersionDelta,
  deckMetadataFromRow,
  playableDeckStatesEqual,
  summarizeDeckVersionDelta,
  versionedDeckStatesEqual,
  type VersionedDeckCard,
} from './versionedDeckState.ts';
import { deck as deckTable } from '../../db/schema/deck.ts';

export async function getDeckVersionHistory(deckId: string): Promise<DeckVersionSummary[]> {
  let versions = await loadOrderedDeckVersions(db, deckId);
  if (versions.length === 0) {
    return [];
  }

  const parent = (await db.select().from(deckTable).where(eq(deckTable.id, deckId)).limit(1))[0];
  const currentCards = await loadCurrentVersionedCards(db, deckId);
  const latestSealed = versions[versions.length - 2]!;
  const reconstructedLatest = await reconstructDeckVersion(db, deckId, latestSealed.versionNumber);
  const openDelta = createDeckVersionDelta(reconstructedLatest.cards, currentCards);
  const openHasPlayableChanges = !playableDeckStatesEqual(
    deckMetadataFromRow(parent),
    currentCards,
    reconstructedLatest.metadata,
    reconstructedLatest.cards,
  );
  const openHasChanges = !versionedDeckStatesEqual(
    deckMetadataFromRow(parent),
    currentCards,
    reconstructedLatest.metadata,
    reconstructedLatest.cards,
  );

  const versionIds = versions.map(version => version.id);
  const rows = versionIds.length
    ? await db
        .select()
        .from(deckVersionCardTable)
        .where(inArray(deckVersionCardTable.deckVersionId, versionIds))
    : [];
  const rowsByVersion = new Map<string, VersionedDeckCard[]>();
  for (const row of rows) {
    if (row.board !== 1 && row.board !== 2) continue;
    const list = rowsByVersion.get(row.deckVersionId) ?? [];
    list.push({ cardId: row.cardId, board: row.board, note: row.note, quantity: row.quantity });
    rowsByVersion.set(row.deckVersionId, list);
  }

  const sealerIds = versions.flatMap(version =>
    version.sealedByUserId ? [version.sealedByUserId] : [],
  );
  const sealers = sealerIds.length
    ? await db
        .select({ id: userTable.id, name: userTable.displayName })
        .from(userTable)
        .where(inArray(userTable.id, sealerIds))
    : [];
  const sealerNames = new Map(sealers.map(sealer => [sealer.id, sealer.name]));

  const summaries: DeckVersionSummary[] = [];
  for (const version of versions) {
    const isOpen = !version.sealedAt;
    const delta = isOpen ? openDelta : (rowsByVersion.get(version.id) ?? []);
    const previousCards =
      version.versionNumber <= 1
        ? []
        : (await reconstructDeckVersion(db, deckId, version.versionNumber - 1)).cards;
    const sealedState = isOpen
      ? null
      : await reconstructDeckVersion(db, deckId, version.versionNumber);
    const previousState =
      !isOpen && version.versionNumber > 1
        ? await reconstructDeckVersion(db, deckId, version.versionNumber - 1)
        : null;
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
      hasChanges: isOpen ? openHasChanges : true,
      hasPlayableChanges: isOpen
        ? openHasPlayableChanges
        : version.versionNumber === 1
          ? true
          : !playableDeckStatesEqual(
              sealedState!.metadata,
              sealedState!.cards,
              previousState!.metadata,
              previousState!.cards,
            ),
      ...summarizeDeckVersionDelta(delta, previousCards),
    });
  }

  return summaries.sort((a, b) => b.versionNumber - a.versionNumber);
}
