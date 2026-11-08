import type { TournamentWeekendMatch } from '../../db/schema/tournament_weekend.ts';
import type { LiveTournamentHomeWatchedMatch } from '../../../types/TournamentWeekend.ts';

export function summarizeWatchedMatch(
  playerDisplayName: string,
  match: Omit<TournamentWeekendMatch, 'id'>,
): LiveTournamentHomeWatchedMatch {
  const isPlayer1 = match.playerDisplayName1 === playerDisplayName;
  const playerGameWins = isPlayer1 ? match.player1GameWin : match.player2GameWin;
  const opponentGameWins = isPlayer1 ? match.player2GameWin : match.player1GameWin;
  const opponentDisplayName = isPlayer1 ? match.playerDisplayName2 : match.playerDisplayName1;
  let outcome: LiveTournamentHomeWatchedMatch['outcome'] = null;

  if (opponentDisplayName === null) {
    outcome = 'bye';
  } else if (match.updatedAt !== null && playerGameWins !== null && opponentGameWins !== null) {
    // Melee also sends 0–0 for unreported pairings; updatedAt records a reported result.
    outcome =
      playerGameWins === opponentGameWins
        ? 'draw'
        : playerGameWins > opponentGameWins
          ? 'win'
          : 'loss';
  }

  return {
    tournamentId: match.tournamentId,
    roundNumber: match.roundNumber,
    matchKey: match.matchKey,
    playerDisplayName,
    opponentDisplayName,
    playerGameWins,
    opponentGameWins,
    outcome,
    updatedAt: match.updatedAt,
    createdAt: match.createdAt,
  };
}

export function compareWatchedMatches(
  left: LiveTournamentHomeWatchedMatch,
  right: LiveTournamentHomeWatchedMatch,
) {
  return (
    left.roundNumber - right.roundNumber ||
    Date.parse(left.updatedAt ?? left.createdAt) - Date.parse(right.updatedAt ?? right.createdAt) ||
    left.matchKey.localeCompare(right.matchKey)
  );
}
