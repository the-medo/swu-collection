import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';

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
  let lostMatches = 0;
  let lostGames = 0;
  let completedMatches = 0;

  matches.forEach(match => {
    if (match.result !== undefined) completedMatches++;
    if (match.result === 3) wonMatches++;
    if (match.result === 0) lostMatches++;

    match.games.forEach(game => {
      totalGames++;
      if (game.isWinner === true) wonGames++;
      if (game.isWinner === false) lostGames++;
    });
  });

  const matchWinrate = completedMatches > 0 ? (wonMatches / completedMatches) * 100 : 0;
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
    matchLosses: lostMatches,
    gameWins: wonGames,
    gameLosses: lostGames,
    matches,
  };
};

export const matchesDeckQuickFilter = (
  deck: Pick<DeckStatistics, 'deckName' | 'leaderCardId' | 'baseCardKey'>,
  quickFilter?: string,
) => {
  const terms = quickFilter
    ?.trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (!terms || terms.length === 0) return true;

  const searchableValues = [deck.deckName, deck.leaderCardId, deck.baseCardKey].map(value =>
    value?.toLowerCase() ?? '',
  );

  return terms.every(term => searchableValues.some(value => value.includes(term)));
};
