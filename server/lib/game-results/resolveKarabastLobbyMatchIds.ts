import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { cardUidToCardId } from '../../../shared/lib/cardUidToCardId.ts';
import { db } from '../../db';
import {
  karabastLobbyMatch,
  type IntegrationGameData,
  type NewKarabastLobbyMatch,
} from '../../db/schema/integration.ts';
import { normalizeKarabastDeckId, type IntegrationGameDataContent } from './karabastGameData.ts';
import {
  createKarabastCardIdResolver,
  type KarabastCardIdResolver,
} from './resolveKarabastCardId.ts';
import type { KarabastResolvedDeckReferences } from './resolveKarabastDeckReferences.ts';

const KARABAST_LOBBY_MATCH_LOCK_NAMESPACE = 28461;

export type KarabastResolvedMatchIds = Record<number, string>;

export type KarabastLobbyMatchIdentity = {
  playerIndex: number;
  userId: string;
  lobbyId: string;
  deckId: string | null;
  deckVersionId: string | null;
  opponentLeaderCardId: string | null;
  opponentBaseCardKey: string | null;
  lookupKey: string;
  lookupKeys: string[];
};

type KarabastLobbyMatchResolutionRow = {
  lookupKey: string;
  matchId: string;
  userId: string;
};

type KarabastLobbyMatchLookupKeyIdentity = Pick<
  KarabastLobbyMatchIdentity,
  'lobbyId' | 'userId' | 'deckId' | 'deckVersionId' | 'opponentLeaderCardId' | 'opponentBaseCardKey'
>;

export const buildKarabastLobbyMatchLookupKey = (identity: KarabastLobbyMatchLookupKeyIdentity) => {
  if (!identity.deckVersionId) {
    return JSON.stringify([
      'karabast-lobby-match/v1',
      identity.lobbyId,
      identity.userId,
      identity.deckId,
      identity.opponentLeaderCardId,
      identity.opponentBaseCardKey,
    ]);
  }
  return JSON.stringify([
    'karabast-lobby-match/v2',
    identity.lobbyId,
    identity.userId,
    identity.deckId,
    identity.deckVersionId,
    identity.opponentLeaderCardId,
    identity.opponentBaseCardKey,
  ]);
};

export const getKarabastLobbyMatchIdentities = (
  integrationData: IntegrationGameData,
  resolveKarabastCardId: KarabastCardIdResolver = cardUidToCardId,
  resolvedDeckReferences?: KarabastResolvedDeckReferences,
): KarabastLobbyMatchIdentity[] => {
  const data = integrationData.data as IntegrationGameDataContent;
  const players = data.players || [];
  const userIds = [integrationData.userId1, integrationData.userId2];

  const identities: KarabastLobbyMatchIdentity[] = [];

  for (let index = 0; index < players.length && index < 2; index++) {
    const player = players[index];
    const userId = userIds[index];

    if (!player || !userId) {
      continue;
    }

    const opponentIndex = index === 0 ? 1 : 0;
    const opponent = players[opponentIndex];

    const resolvedDeck = resolvedDeckReferences?.[index];
    const hasResolvedDeckLookup = resolvedDeckReferences && index in resolvedDeckReferences;
    const identity: KarabastLobbyMatchIdentity = {
      playerIndex: index,
      userId,
      lobbyId: integrationData.lobbyId,
      deckId: hasResolvedDeckLookup
        ? (resolvedDeck?.deckId ?? null)
        : normalizeKarabastDeckId(player.data?.deck?.id),
      deckVersionId: resolvedDeck?.deckVersionId ?? null,
      opponentLeaderCardId: resolveKarabastCardId(opponent?.data?.leader),
      opponentBaseCardKey: resolveKarabastCardId(opponent?.data?.base, true),
      lookupKey: '',
      lookupKeys: [],
    };

    identity.lookupKey = buildKarabastLobbyMatchLookupKey(identity);
    const legacyLookupKey = buildKarabastLobbyMatchLookupKey({
      ...identity,
      deckVersionId: null,
    });
    identity.lookupKeys = [identity.lookupKey, legacyLookupKey];
    identities.push(identity);
  }

  return identities;
};

export const addLegacyKarabastLobbyMatchLookupKeys = (
  identities: KarabastLobbyMatchIdentity[],
  legacyIdentities: KarabastLobbyMatchIdentity[],
): KarabastLobbyMatchIdentity[] => {
  const legacyByPlayerIndex = new Map(
    legacyIdentities.map(identity => [identity.playerIndex, identity]),
  );

  return identities.map(identity => {
    const legacyIdentity = legacyByPlayerIndex.get(identity.playerIndex);
    const lookupKeys = [
      ...identity.lookupKeys,
      ...(legacyIdentity?.lookupKey && legacyIdentity.lookupKey !== identity.lookupKey
        ? [legacyIdentity.lookupKey]
        : []),
    ];

    return {
      ...identity,
      lookupKeys,
    };
  });
};

const assertSingleResolvedMatchId = (
  identities: KarabastLobbyMatchIdentity[],
  rows: KarabastLobbyMatchResolutionRow[],
  lobbyId: string,
  resolvedMatchId?: string,
) => {
  const matchIds = [...new Set(rows.map(row => row.matchId))];

  if (matchIds.length > 1) {
    throw new Error(
      `Conflicting Karabast match mappings found for lobby ${lobbyId}: ${matchIds.join(', ')}`,
    );
  }

  const rowsByLookupKey = new Map(rows.map(row => [row.lookupKey, row.matchId]));
  const rowsByMatchUserKey = new Map(
    rows.map(row => [`${row.matchId}:${row.userId}`, row.matchId]),
  );
  const resolvedMatchIdsByLookupKey = new Map<string, string>();

  identities.forEach(identity => {
    const lookupMatchId = identity.lookupKeys
      .map(lookupKey => rowsByLookupKey.get(lookupKey))
      .find(Boolean);
    if (lookupMatchId) {
      resolvedMatchIdsByLookupKey.set(identity.lookupKey, lookupMatchId);
      return;
    }

    const matchUserMatchId = resolvedMatchId
      ? rowsByMatchUserKey.get(`${resolvedMatchId}:${identity.userId}`)
      : undefined;
    if (matchUserMatchId) {
      resolvedMatchIdsByLookupKey.set(identity.lookupKey, matchUserMatchId);
      return;
    }

    throw new Error(
      `Missing Karabast match mapping for lobby ${lobbyId}, player index ${identity.playerIndex}`,
    );
  });

  return resolvedMatchIdsByLookupKey;
};

export const resolveKarabastLobbyMatchIds = async (
  integrationData: IntegrationGameData,
  // When omitted, this function builds one from the DB-backed preview-card cache.
  karabastCardIdResolver?: KarabastCardIdResolver,
  resolvedDeckReferences?: KarabastResolvedDeckReferences,
): Promise<KarabastResolvedMatchIds> => {
  const resolveKarabastCardId = karabastCardIdResolver ?? (await createKarabastCardIdResolver());
  const identities = addLegacyKarabastLobbyMatchLookupKeys(
    getKarabastLobbyMatchIdentities(integrationData, resolveKarabastCardId, resolvedDeckReferences),
    getKarabastLobbyMatchIdentities(integrationData, cardUidToCardId, resolvedDeckReferences),
  );

  if (identities.length === 0) {
    return {};
  }

  const lookupKeys = [...new Set(identities.flatMap(identity => identity.lookupKeys))];
  const userIds = [...new Set(identities.map(identity => identity.userId))];

  return db.transaction(async tx => {
    // Serialize match resolution per lobby to keep both linked-player rows on the same match ID.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${KARABAST_LOBBY_MATCH_LOCK_NAMESPACE}, hashtext(${integrationData.lobbyId}))`,
    );

    const selectRows = async (matchId?: string) => {
      const whereClause = matchId
        ? or(
            inArray(karabastLobbyMatch.lookupKey, lookupKeys),
            and(
              eq(karabastLobbyMatch.matchId, matchId),
              inArray(karabastLobbyMatch.userId, userIds),
            ),
          )
        : inArray(karabastLobbyMatch.lookupKey, lookupKeys);

      return tx
        .select({
          lookupKey: karabastLobbyMatch.lookupKey,
          matchId: karabastLobbyMatch.matchId,
          userId: karabastLobbyMatch.userId,
        })
        .from(karabastLobbyMatch)
        .where(whereClause);
    };

    let rows = await selectRows();
    const existingMatchIds = [...new Set(rows.map(row => row.matchId))];

    if (existingMatchIds.length > 1) {
      throw new Error(
        `Conflicting Karabast match mappings already exist for lobby ${integrationData.lobbyId}: ${existingMatchIds.join(', ')}`,
      );
    }

    const resolvedMatchId = existingMatchIds[0] ?? crypto.randomUUID();
    const existingLookupKeys = new Set(rows.map(row => row.lookupKey));
    const now = new Date().toISOString();

    // A legacy alias match is enough to reuse the existing match ID. In that case we do not
    // insert an additional canonical-key row; the alias support below remains the compatibility
    // bridge for pre-existing rows that used raw preview Karabast IDs.
    const missingRows: NewKarabastLobbyMatch[] = identities
      .filter(identity => !identity.lookupKeys.some(lookupKey => existingLookupKeys.has(lookupKey)))
      .map(identity => ({
        matchId: resolvedMatchId,
        userId: identity.userId,
        lobbyId: identity.lobbyId,
        deckId: identity.deckId,
        deckVersionId: identity.deckVersionId,
        opponentLeaderCardId: identity.opponentLeaderCardId,
        opponentBaseCardKey: identity.opponentBaseCardKey,
        lookupKey: identity.lookupKey,
        createdAt: now,
        updatedAt: now,
      }));

    if (missingRows.length > 0) {
      await tx.insert(karabastLobbyMatch).values(missingRows).onConflictDoNothing();

      rows = await selectRows(resolvedMatchId);
    }

    const rowsByLookupKey = assertSingleResolvedMatchId(
      identities,
      rows,
      integrationData.lobbyId,
      resolvedMatchId,
    );

    const resolvedMatchIds: KarabastResolvedMatchIds = {};
    identities.forEach(identity => {
      const matchId = rowsByLookupKey.get(identity.lookupKey);
      if (!matchId) {
        throw new Error(
          `Missing resolved Karabast match ID for lobby ${integrationData.lobbyId}, player index ${identity.playerIndex}`,
        );
      }

      resolvedMatchIds[identity.playerIndex] = matchId;
    });

    return resolvedMatchIds;
  });
};
