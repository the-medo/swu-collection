import type { IntegrationGameData } from '../../db/schema/integration.ts';
import type { GameResult } from '../../db/schema/game_result.ts';

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
    cardMetrics?: Record<
      string,
      {
        drawn?: number;
        played?: number;
        activated?: number;
        discarded?: number;
        resourced?: number;
      }
    >;
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
export const transformKarabastGameDataToGameResults = (
  integrationData: IntegrationGameData,
): GameResult[] => {
  const data = integrationData.data as IntegrationGameDataContent; // The Karabast payload
  const players = data.players || [];
  const gameResults: GameResult[] = [];

  const userIds = [integrationData.userId1, integrationData.userId2];

  players.forEach((player, index) => {
    const userId = userIds[index];

    // Only create a game result if we have a valid user_id linked
    if (!userId) {
      return;
    }

    const opponentIndex = index === 0 ? 1 : 0;
    const opponent = players[opponentIndex];

    const result: GameResult = {
      userId: userId,
      gameId: integrationData.gameId,
      matchId: integrationData.lobbyId,
      gameNumber: data.sequenceNumber || null,

      leaderCardId: player.data?.leader || null,
      baseCardKey: player.data?.base || null,

      opponentLeaderCardId: opponent?.data?.leader || null,
      opponentBaseCardKey: opponent?.data?.base || null,

      isWinner: player.data?.isWinner || false,

      gameSource: 'karabast',

      cardMetrics: player.cardMetrics || {},
      roundMetrics: {},

      otherData: {
        format: data.format,
        roundNumber: data.roundNumber,
        startedAt: data.startedAt,
        finishedAt: data.finishedAt,
        opponentName: opponent?.data?.name,
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    gameResults.push(result);
  });

  return gameResults;
};
