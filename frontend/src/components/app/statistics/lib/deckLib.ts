import { MatchResult } from '@/components/app/statistics/useGameResults.ts';

export interface DeckStatistics {
  deckId: string;
  deckName: string | undefined;
  cardPoolId: string | undefined | null;
  leaderCardId: string;
  baseCardKey: string;
  matchWinrate: number;
  gameWinrate: number;
  matchWins: number;
  matchLosses: number;
  gameWins: number;
  gameLosses: number;
  matches: MatchResult[];
}

export const calculateDeckStatistics = (deckId: string, matches: MatchResult[]): DeckStatistics => {
  const firstMatch = matches[0]; // To get leader and base
  const firstMatchGame = firstMatch?.games[0]; // To get leader and base

  let totalGames = 0;
  let wonGames = 0;
  let wonMatches = 0;

  matches.forEach(match => {
    if (match.result === 3) wonMatches++;

    match.games.forEach(game => {
      totalGames++;
      if (game.isWinner) wonGames++;
    });
  });

  const matchWinrate = matches.length > 0 ? (wonMatches / matches.length) * 100 : 0;
  const gameWinrate = totalGames > 0 ? (wonGames / totalGames) * 100 : 0;

  return {
    deckId,
    deckName: firstMatchGame?.otherData.deckInfo?.name,
    cardPoolId: firstMatchGame?.otherData.deckInfo?.cardPoolId,
    leaderCardId: firstMatch?.leaderCardId || '',
    baseCardKey: firstMatch?.baseCardKey || '',
    matchWinrate,
    gameWinrate,
    matchWins: wonMatches,
    matchLosses: matches.length - wonMatches,
    gameWins: wonGames,
    gameLosses: totalGames - wonGames,
    matches,
  };
};
