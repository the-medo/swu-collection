import type { MatchResult } from './MatchResult.ts';

interface ResultRecords {
  totalMatches: number;
  totalGames: number;
  matchWins: number;
  matchLosses: number;
  gameWins: number;
  gameLosses: number;
}

// Equal totals can still have different outcomes, e.g. a forfeit after one won game.
// When totals and W/L are equal, the remaining drawn results are equal as well.
export const areGameAndMatchRecordsEqual = (stats: ResultRecords) =>
  stats.totalGames === stats.totalMatches &&
  stats.gameWins === stats.matchWins &&
  stats.gameLosses === stats.matchLosses;

export const calculateResultStatistics = (matches: MatchResult[] = []) => {
  let totalMatches = 0;
  let totalGames = 0;
  let matchWins = 0;
  let matchLosses = 0;
  let matchDraws = 0;
  let gameWins = 0;
  let gameLosses = 0;
  let gameDraws = 0;
  let containsInTeam = false;
  let containsNotInTeam = false;

  matches.forEach(match => {
    // Paired team records count once; their outcomes are excluded from team W/L.
    if (match.inTeam) {
      containsInTeam = true;
      if (match.id.startsWith('inTeam-')) {
        totalGames += match.games.length;
        if (match.result !== undefined) totalMatches++;
      }
      return;
    }
    containsNotInTeam = true;
    if (match.result !== undefined) totalMatches++;
    if (match.result === 3) matchWins++;
    else if (match.result === 0) matchLosses++;
    else if (match.result === 1) matchDraws++;
    totalGames += match.games.length;
    match.games.forEach(game => {
      if (game.isWinner === true) gameWins++;
      else if (game.isWinner === false) gameLosses++;
      else gameDraws++;
    });
  });

  return {
    totalMatches,
    totalGames,
    matchWins,
    matchLosses,
    matchDraws,
    gameWins,
    gameLosses,
    gameDraws,
    matchWinrate: totalMatches > 0 ? (matchWins / totalMatches) * 100 : 0,
    gameWinrate: totalGames > 0 ? (gameWins / totalGames) * 100 : 0,
    containsInTeam,
    containsNotInTeam,
  };
};
