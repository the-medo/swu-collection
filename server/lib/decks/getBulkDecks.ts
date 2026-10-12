import { and, asc, eq, inArray, isNotNull, lte, or } from 'drizzle-orm';
import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { deckCard, type DeckCard } from '../../db/schema/deck_card.ts';
import { deckVersion, deckVersionCard } from '../../db/schema/deck_version.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { userDeckFavorite } from '../../db/schema/user_deck_favorite.ts';
import { selectUser } from '../../routes/user.ts';
import type { DeckData } from '../../../types/Deck.ts';
import type { ResolvedDeckReference } from './resolveDeckReference.ts';
import { getDeckPermissionsForDecks, permissionsForDeckReference } from './getDeckPermissions.ts';
import {
  applyDeckVersionDelta,
  normalizeVersionDecklist,
  type VersionedDeckCard,
} from './versionedDeckState.ts';
import { DeckVersionError } from './deckVersionErrors.ts';

type BulkDeckExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface DecksBulkResponse {
  decks: Record<string, DeckData | undefined>;
  cards: Record<string, DeckCard[]>;
}

export async function getBulkDecks(
  ids: string[],
  actorId: string | null,
  isAdmin = false,
): Promise<DecksBulkResponse> {
  return db.transaction(tx => readBulkDecks(ids, actorId, isAdmin, tx), {
    isolationLevel: 'repeatable read',
    accessMode: 'read only',
  });
}

async function readBulkDecks(
  ids: string[],
  actorId: string | null,
  isAdmin: boolean,
  executor: BulkDeckExecutor,
): Promise<DecksBulkResponse> {
  const result: DecksBulkResponse = { decks: {}, cards: {} };
  const requestedIds = [...new Set(ids)];
  if (!requestedIds.length) return result;
  const parents = await executor.select().from(deck).where(inArray(deck.id, requestedIds));
  const references = new Map<string, ResolvedDeckReference>(
    parents.map(parent => [
      parent.id,
      {
        deck: parent,
        version: null,
        reference: {
          id: parent.id,
          deckId: parent.id,
          deckVersionId: null,
          versionNumber: null,
          kind: 'parent',
          latestVersionNumber: parent.versionCount,
        },
      },
    ]),
  );
  const remainingIds = requestedIds.filter(id => !references.has(id));
  if (remainingIds.length) {
    const rows = await executor
      .select({ deck, version: deckVersion })
      .from(deckVersion)
      .innerJoin(deck, eq(deck.id, deckVersion.deckId))
      .where(inArray(deckVersion.id, remainingIds));
    for (const row of rows)
      references.set(row.version.id, {
        ...row,
        reference: {
          id: row.version.id,
          deckId: row.deck.id,
          deckVersionId: row.version.id,
          versionNumber: row.version.versionNumber,
          kind: row.version.sealedAt ? 'sealed-version' : 'open-version',
          latestVersionNumber: row.deck.versionCount,
        },
      });
  }
  const uniqueParents = [
    ...new Map([...references.values()].map(row => [row.deck.id, row.deck])).values(),
  ];
  const permissions = await getDeckPermissionsForDecks(uniqueParents, actorId, isAdmin, executor);
  const allowed = [...references.values()].filter(row => permissions.get(row.deck.id)?.canRead);
  if (!allowed.length) return result;
  const deckIds = [...new Set(allowed.map(row => row.deck.id))];
  const ownerIds = [...new Set(allowed.map(row => row.deck.userId))];
  const owners = new Map(
    (await executor.select(selectUser).from(user).where(inArray(user.id, ownerIds))).map(owner => [
      owner.id,
      owner,
    ]),
  );
  const favorites = new Map(
    actorId
      ? (
          await executor
            .select()
            .from(userDeckFavorite)
            .where(
              and(eq(userDeckFavorite.userId, actorId), inArray(userDeckFavorite.deckId, deckIds)),
            )
        ).map(favorite => [favorite.deckId, favorite.createdAt.toISOString()])
      : [],
  );
  const liveIds = [
    ...new Set(allowed.filter(row => !row.version?.sealedAt).map(row => row.deck.id)),
  ];
  const liveCards = new Map<string, DeckCard[]>();
  if (liveIds.length) {
    for (const card of await executor
      .select()
      .from(deckCard)
      .where(inArray(deckCard.deckId, liveIds))) {
      const cards = liveCards.get(card.deckId) ?? [];
      cards.push(card);
      liveCards.set(card.deckId, cards);
    }
  }

  const sealedTargets = allowed.filter(row => row.version?.sealedAt);
  const sealedCards = new Map<string, VersionedDeckCard[]>();
  if (sealedTargets.length) {
    const maxVersions = new Map<string, number>();
    for (const row of sealedTargets)
      maxVersions.set(
        row.deck.id,
        Math.max(maxVersions.get(row.deck.id) ?? 0, row.version!.versionNumber),
      );
    const versions = await executor
      .select()
      .from(deckVersion)
      .where(
        and(
          isNotNull(deckVersion.sealedAt),
          or(
            ...[...maxVersions].map(([deckId, number]) =>
              and(eq(deckVersion.deckId, deckId), lte(deckVersion.versionNumber, number)),
            ),
          ),
        ),
      )
      .orderBy(asc(deckVersion.deckId), asc(deckVersion.versionNumber));
    const deltas = new Map<string, VersionedDeckCard[]>();
    if (versions.length) {
      for (const row of await executor
        .select()
        .from(deckVersionCard)
        .where(
          inArray(
            deckVersionCard.deckVersionId,
            versions.map(version => version.id),
          ),
        )) {
        if (row.board !== 1 && row.board !== 2)
          throw new DeckVersionError(
            'Deck version history contains a maybeboard row',
            'INVALID_VERSION_HISTORY',
          );
        const cards = deltas.get(row.deckVersionId) ?? [];
        cards.push({
          cardId: row.cardId,
          board: row.board,
          note: row.note,
          quantity: row.quantity,
        });
        deltas.set(row.deckVersionId, cards);
      }
    }
    let currentDeckId: string | undefined;
    let cards: VersionedDeckCard[] = [];
    const targetIds = new Set(sealedTargets.map(row => row.version!.id));
    for (const version of versions) {
      if (version.deckId !== currentDeckId) {
        if (version.versionNumber !== 1)
          throw new DeckVersionError(
            'Deck version history has no sealed v1 checkpoint',
            'INVALID_VERSION_HISTORY',
          );
        currentDeckId = version.deckId;
        cards = [];
      }
      cards = applyDeckVersionDelta(cards, deltas.get(version.id) ?? []);
      if (targetIds.has(version.id)) sealedCards.set(version.id, cards);
    }
  }

  for (const resolved of allowed) {
    const version = resolved.version;
    const effectiveDeck = version?.sealedAt
      ? {
          ...resolved.deck,
          name: version.name ?? resolved.deck.name,
          description: version.description ?? '',
          format: version.format ?? resolved.deck.format,
          leaderCardId1: version.leaderCardId1,
          leaderCardId2: version.leaderCardId2,
          baseCardId: version.baseCardId,
          updatedAt: version.sourceDeckUpdatedAt ?? version.sealedAt,
        }
      : resolved.deck;
    result.decks[resolved.reference.id] = {
      deck: effectiveDeck as unknown as DeckData['deck'],
      user: owners.get(resolved.deck.userId) as unknown as DeckData['user'],
      isFavorite: favorites.get(resolved.deck.id) ?? null,
      reference: resolved.reference,
      permissions: permissionsForDeckReference(
        permissions.get(resolved.deck.id)!,
        resolved.reference.kind,
      ),
    };
    if (version?.sealedAt && !sealedCards.has(version.id))
      throw new DeckVersionError(
        'The requested sealed deck version does not exist',
        'VERSION_NOT_FOUND',
      );
    result.cards[resolved.reference.id] = version
      ? (version.sealedAt
          ? sealedCards.get(version.id)!
          : normalizeVersionDecklist(liveCards.get(resolved.deck.id) ?? [])
        ).map(card => ({ deckId: resolved.deck.id, ...card }))
      : (liveCards.get(resolved.deck.id) ?? []);
  }
  return result;
}
