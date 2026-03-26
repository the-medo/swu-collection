import { inArray, sql } from 'drizzle-orm';
import { cardUidToCardId } from '../../../shared/lib/cardUidToCardId.ts';
import { db } from '../../db';
import {
  karabastLobbyMatch,
  type IntegrationGameData,
  type NewKarabastLobbyMatch,
} from '../../db/schema/integration.ts';
import { normalizeKarabastDeckId, type IntegrationGameDataContent } from './karabastGameData.ts';

const KARABAST_LOBBY_MATCH_LOCK_NAMESPACE = 28461;

export type KarabastResolvedMatchIds = Record<number, string>;

export type KarabastLobbyMatchIdentity = {
  playerIndex: number;
  userId: string;
  lobbyId: string;
  deckId: string | null;
  opponentLeaderCardId: string | null;
  opponentBaseCardKey: string | null;
  lookupKey: string;
};

export const buildKarabastLobbyMatchLookupKey = (
  identity: Omit<KarabastLobbyMatchIdentity, 'playerIndex' | 'lookupKey'>,
) => {
  return JSON.stringify([
    'karabast-lobby-match/v1',
    identity.lobbyId,
    identity.userId,
    identity.deckId,
    identity.opponentLeaderCardId,
    identity.opponentBaseCardKey,
  ]);
};

export const getKarabastLobbyMatchIdentities = (
  integrationData: IntegrationGameData,
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

    const identity = {
      playerIndex: index,
      userId,
      lobbyId: integrationData.lobbyId,
      deckId: normalizeKarabastDeckId(player.data?.deck?.id),
      opponentLeaderCardId: cardUidToCardId(opponent?.data?.leader),
      opponentBaseCardKey: cardUidToCardId(opponent?.data?.base, true),
      lookupKey: '',
    } satisfies KarabastLobbyMatchIdentity;

    identity.lookupKey = buildKarabastLobbyMatchLookupKey(identity);
    identities.push(identity);
  }

  return identities;
};

const assertSingleResolvedMatchId = (
  identities: KarabastLobbyMatchIdentity[],
  rows: { lookupKey: string; matchId: string }[],
  lobbyId: string,
) => {
  const matchIds = [...new Set(rows.map(row => row.matchId))];

  if (matchIds.length > 1) {
    throw new Error(
      `Conflicting Karabast match mappings found for lobby ${lobbyId}: ${matchIds.join(', ')}`,
    );
  }

  const rowsByLookupKey = new Map(rows.map(row => [row.lookupKey, row.matchId]));

  identities.forEach(identity => {
    if (!rowsByLookupKey.has(identity.lookupKey)) {
      throw new Error(
        `Missing Karabast match mapping for lobby ${lobbyId}, player index ${identity.playerIndex}`,
      );
    }
  });

  return rowsByLookupKey;
};

export const resolveKarabastLobbyMatchIds = async (
  integrationData: IntegrationGameData,
): Promise<KarabastResolvedMatchIds> => {
  const identities = getKarabastLobbyMatchIdentities(integrationData);

  if (identities.length === 0) {
    return {};
  }

  const lookupKeys = identities.map(identity => identity.lookupKey);

  return db.transaction(async tx => {
    // Serialize match resolution per lobby to keep both linked-player rows on the same match ID.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${KARABAST_LOBBY_MATCH_LOCK_NAMESPACE}, hashtext(${integrationData.lobbyId}))`,
    );

    const selectRows = async () => {
      return tx
        .select({
          lookupKey: karabastLobbyMatch.lookupKey,
          matchId: karabastLobbyMatch.matchId,
        })
        .from(karabastLobbyMatch)
        .where(inArray(karabastLobbyMatch.lookupKey, lookupKeys));
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

    const missingRows: NewKarabastLobbyMatch[] = identities
      .filter(identity => !existingLookupKeys.has(identity.lookupKey))
      .map(identity => ({
        matchId: resolvedMatchId,
        userId: identity.userId,
        lobbyId: identity.lobbyId,
        deckId: identity.deckId,
        opponentLeaderCardId: identity.opponentLeaderCardId,
        opponentBaseCardKey: identity.opponentBaseCardKey,
        lookupKey: identity.lookupKey,
        createdAt: now,
        updatedAt: now,
      }));

    if (missingRows.length > 0) {
      await tx
        .insert(karabastLobbyMatch)
        .values(missingRows)
        .onConflictDoNothing({ target: [karabastLobbyMatch.lookupKey] });

      rows = await selectRows();
    }

    const rowsByLookupKey = assertSingleResolvedMatchId(identities, rows, integrationData.lobbyId);

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
