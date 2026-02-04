import { type IntegrationGameData, userIntegration } from '../../db/schema/integration.ts';
import type { GameResult, GameResultDeckInfo } from '../../db/schema/game_result.ts';
import { cardUidToCardId } from '../../../shared/lib/cardUidToCardId.ts';
import type { CardMetrics } from '../../../shared/types/cardMetrics.ts';
import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { eq } from 'drizzle-orm';

export type IntegrationGameDataContent = {
  format?: string;
  gameId?: string;
  lobbyId?: string;
  players?: {
    data?: {
      id?: string;
      base?: string;
      deck?: {
        id?: string;
        name?: string;
        deckSource?: string;
        base?: {
          id?: string;
          cost?: number | null;
          count?: number;
          internalName?: string;
        };
        leader?: {
          id?: string;
          cost?: number | null;
          count?: number;
          internalName?: string;
        };
      };
      name?: string;
      leader?: string;
      isWinner?: boolean;
      accessToken?: string | null;
    };
    cardMetrics?: CardMetrics;
  }[];
  startedAt?: string;
  finishedAt?: string;
  roundNumber?: number;
  winnerNames?: string[];
  sequenceNumber?: number;
};

/**
 * Transforms data from the integrationGameData into game result table.
 * One row in integration game data can have one or two rows in game results table,
 * based on the number of players available - every player has to have his own row in game results!
 */
export const transformKarabastGameDataToGameResults = async (
  integrationData: IntegrationGameData,
): Promise<GameResult[]> => {
  const data = integrationData.data as IntegrationGameDataContent; // The Karabast payload
  const players = data.players || [];
  const gameResults: GameResult[] = [];

  const userIds = [integrationData.userId1, integrationData.userId2];

  const mapCardMetricsKeysToCardIds = (metrics: CardMetrics) => {
    const out: typeof metrics = {};

    Object.entries(metrics).forEach(([uid, value]) => {
      const cardId = cardUidToCardId(uid);
      if (!cardId) return;

      out[cardId] = value ?? {};
    });

    return out;
  };

  for (let index = 0; index < players.length; index++) {
    const player = players[index];
    const userId = userIds[index];

    // Only create a game result if we have a valid user_id linked
    if (!userId) {
      continue;
    }

    const opponentIndex = index === 0 ? 1 : 0;
    const opponent = players[opponentIndex];
    const deckId = player.data?.deck?.id;

    let deckInfo: GameResultDeckInfo = {};
    if (deckId) {
      deckInfo = (
        await db
          .select({
            name: deck.name,
            cardPoolId: deck.cardPoolId,
          })
          .from(deck)
          .where(eq(deck.id, deckId))
          .limit(1)
      )[0];
    }

    const result: GameResult = {
      userId: userId,
      deckId: player.data?.deck?.id,
      gameId: integrationData.gameId,
      matchId: integrationData.lobbyId,
      gameNumber: data.sequenceNumber || null,
      format: data.format || null,

      leaderCardId: cardUidToCardId(player.data?.leader),
      baseCardKey: cardUidToCardId(player.data?.base, true),

      opponentLeaderCardId: cardUidToCardId(opponent?.data?.leader),
      opponentBaseCardKey: cardUidToCardId(opponent?.data?.base, true),

      isWinner: player.data?.isWinner || false,

      gameSource: 'karabast',

      cardMetrics: mapCardMetricsKeysToCardIds(player.cardMetrics || {}),
      roundMetrics: {},

      otherData: {
        roundNumber: data.roundNumber,
        startedAt: data.startedAt,
        finishedAt: data.finishedAt,
        opponentName: opponent?.data?.name,
        deckInfo,
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    gameResults.push(result);
  }

  return gameResults;
};
