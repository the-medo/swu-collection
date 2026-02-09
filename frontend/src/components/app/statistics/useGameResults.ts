import { useSession } from '@/lib/auth-client.ts';
import { useGetGameResults } from '@/api/game-results/useGetGameResults.ts';
import { useMemo } from 'react';
import { GameResult } from '../../../../../server/db/schema/game_result.ts';
import { useSearch } from '@tanstack/react-router';
import { format } from 'date-fns';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';

export interface StatisticsHistoryData {
  games: {
    object: Record<string, GameResult>; // game id is the key
    array: GameResult[]; //sorted game pointers to `.object` property (desc by createdAt)
  };
  matches: {
    object: Record<string, MatchResult>; // match id is the key
    array: MatchResult[]; // sorted match pointers to `.object` property (desc by firstGameCreatedAt)
    byDate: Record<string, MatchResult[]>;
    byLeaderBase: {
      lastPlayed: Record<string, string>;
      matches: Record<string, MatchResult[]>;
    };
    byDeckId: {
      lastPlayed: Record<string, string>;
      matches: Record<string, MatchResult[]>;
    };
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
  const { sFormatId, sDateRangeFrom, sDateRangeTo, sKarabastFormat } = useSearch({
    strict: false,
  });

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
          byDate: {},
          byLeaderBase: {
            lastPlayed: {},
            matches: {},
          },
          byDeckId: {
            lastPlayed: {},
            matches: {},
          },
        },
      };
    }

    const gamesObject: Record<string, GameResult> = {};
    gameResultData.forEach(game => {
      if (game.id) {
        if (!game.createdAt) return;

        const createdAtDateString = format(new Date(`${game.createdAt}Z`), 'yyyy-MM-dd');

        if (datetimeFrom && createdAtDateString < datetimeFrom) return;
        if (datetimeTo && createdAtDateString > datetimeTo) return;
        if (sDateRangeFrom && createdAtDateString < sDateRangeFrom) return;
        if (sDateRangeTo && createdAtDateString > sDateRangeTo) return;

        if (sFormatId && game.otherData?.deckInfo?.formatId !== sFormatId) return;
        if (sKarabastFormat && game.format !== sKarabastFormat) return;
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
          deckId: game.deckId ?? undefined,
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

    const matchesByDate: Record<string, MatchResult[]> = {};
    matchesArray.forEach(match => {
      if (!match.firstGameCreatedAt) return;
      const date = new Date(`${match.firstGameCreatedAt}Z`);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      if (!matchesByDate[dateString]) {
        matchesByDate[dateString] = [];
      }
      matchesByDate[dateString].push(match);
    });

    const matchesByLeaderBase: StatisticsHistoryData['matches']['byLeaderBase'] = {
      lastPlayed: {},
      matches: {},
    };
    const matchesByDeckId: StatisticsHistoryData['matches']['byDeckId'] = {
      lastPlayed: {},
      matches: {},
    };

    matchesArray.forEach(match => {
      if (match.leaderCardId && match.baseCardKey) {
        const key = `${match.leaderCardId}|${match.baseCardKey}`;
        if (!matchesByLeaderBase.matches[key]) {
          matchesByLeaderBase.matches[key] = [];
        }
        matchesByLeaderBase.matches[key].push(match);

        const currentLastPlayed = matchesByLeaderBase.lastPlayed[key];
        if (!currentLastPlayed || match.firstGameCreatedAt > currentLastPlayed) {
          matchesByLeaderBase.lastPlayed[key] = match.firstGameCreatedAt;
        }
      }

      if (match.deckId) {
        const key = match.deckId;
        if (!matchesByDeckId.matches[key]) {
          matchesByDeckId.matches[key] = [];
        }
        matchesByDeckId.matches[key].push(match);

        const currentLastPlayed = matchesByDeckId.lastPlayed[key];
        if (!currentLastPlayed || match.firstGameCreatedAt > currentLastPlayed) {
          matchesByDeckId.lastPlayed[key] = match.firstGameCreatedAt;
        }
      }
    });

    return {
      games: {
        object: gamesObject,
        array: gamesArray,
      },
      matches: {
        object: matchesObject,
        array: matchesArray,
        byDate: matchesByDate,
        byLeaderBase: matchesByLeaderBase,
        byDeckId: matchesByDeckId,
      },
    };
  }, [
    gameResultData,
    isLoading,
    datetimeFrom,
    datetimeTo,
    sDateRangeFrom,
    sDateRangeTo,
    sFormatId,
    sKarabastFormat,
  ]);
};
