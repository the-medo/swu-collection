import { useSession } from '@/lib/auth-client.ts';
import { useGetGameResults } from '@/api/game-results/useGetGameResults.ts';
import { useMemo } from 'react';
import { GameResult } from '../../../../../server/db/schema/game_result.ts';

export type MatchResult = {
  id: string;
  type: 'Bo1' | 'Bo3' | 'other';
  games: GameResult[];

  gameSource: string;
  format: string;

  exclude: boolean;
  manuallyEdited: boolean;

  leaderCardId?: string;
  baseCardKey?: string;
  opponentLeaderCardId?: string;
  opponentBaseCardKey?: string;

  result?: 0 | 1 | 3;
  finalWins?: number;
  finalLosses?: number;

  userEventId?: string;
  firstGameCreatedAt: string;
};

export interface StatisticsHistoryData {
  games: {
    object: Record<string, GameResult>; // game id is the key
    array: GameResult[]; //sorted game pointers to `.object` property (desc by createdAt)
  };
  matches: {
    object: Record<string, MatchResult>; // match id is the key
    array: MatchResult[]; // sorted match pointers to `.object` property (desc by firstGameCreatedAt)
  };
}

interface UseGameResultsParams {
  datetimeFrom?: string;
  datetimeTo?: string;
  teamId?: string;
}

export const useGameResults = (
  params: UseGameResultsParams = {},
): StatisticsHistoryData | undefined => {
  const { datetimeFrom, datetimeTo, teamId } = params;

  const session = useSession();

  const { data: gameResultData, isLoading } = useGetGameResults({
    enabled: !!session.data,
    userId: session.data?.user.id,
    teamId,
  });

  return useMemo(() => {
    if (isLoading || !gameResultData) {
      return {
        games: {
          object: {},
          array: [],
        },
        matches: {
          object: {},
          array: [],
        },
      };
    }

    const gamesObject: Record<string, GameResult> = {};
    gameResultData.forEach(game => {
      if (game.id) {
        if (datetimeFrom && (!game.createdAt || game.createdAt < datetimeFrom)) return;
        if (datetimeTo && (!game.createdAt || game.createdAt > datetimeTo)) return;
        gamesObject[game.id] = game;
      }
    });

    const gamesArray = Object.values(gamesObject).sort((a, b) => {
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

    const matchesObject: Record<string, MatchResult> = {};

    gamesArray.forEach(game => {
      const matchId = game.matchId || `manual-${game.id}`;
      if (!matchesObject[matchId]) {
        matchesObject[matchId] = {
          id: matchId,
          type: 'other',
          games: [],
          gameSource: game.gameSource,
          format: game.format ?? '',
          leaderCardId: game.leaderCardId ?? undefined,
          baseCardKey: game.baseCardKey ?? undefined,
          opponentLeaderCardId: game.opponentLeaderCardId ?? undefined,
          opponentBaseCardKey: game.opponentBaseCardKey ?? undefined,
          userEventId: game.userEventId ?? undefined,
          exclude: false,
          manuallyEdited: false,
          firstGameCreatedAt: '',
        };
      }
      matchesObject[matchId].games.push(game);
    });

    Object.values(matchesObject).forEach(match => {
      match.exclude = match.games.every(g => g.exclude);
      match.manuallyEdited = match.games.some(g => g.manuallyEdited);

      const gameCount = match.games.length;
      if (gameCount === 1) {
        match.type = 'Bo1';
      } else if (gameCount >= 2 && gameCount <= 3) {
        match.type = 'Bo3';
      } else {
        match.type = 'other';
      }

      let wins = 0;
      let losses = 0;
      match.games.forEach(g => {
        if (g.isWinner === true) wins++;
        else if (g.isWinner === false) losses++;
      });

      match.finalWins = wins;
      match.finalLosses = losses;

      if (wins > losses) {
        match.result = 3;
      } else if (wins === losses) {
        match.result = 1;
      } else {
        match.result = 0;
      }

      match.games.sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0));

      const firstGame = match.games.reduce((prev, curr) => {
        return new Date(prev.createdAt ?? 0).getTime() < new Date(curr.createdAt ?? 0).getTime()
          ? prev
          : curr;
      });
      match.firstGameCreatedAt = firstGame.createdAt ?? '';
    });

    const matchesArray = Object.values(matchesObject).sort((a, b) => {
      return new Date(b.firstGameCreatedAt).getTime() - new Date(a.firstGameCreatedAt).getTime();
    });

    return {
      games: {
        object: gamesObject,
        array: gamesArray,
      },
      matches: {
        object: matchesObject,
        array: matchesArray,
      },
    };
  }, [gameResultData, isLoading, datetimeFrom, datetimeTo]);
};
