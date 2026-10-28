import type { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import type { MatchData } from '../lib/tournamentLib.ts';
import { BracketInfo } from '../../../../../../types/enums.ts';

export const bracketInfoToNumber: Record<BracketInfo, number> = {
  [BracketInfo.NONE]: 8,
  [BracketInfo.TOP4]: 4,
  [BracketInfo.TOP8]: 8,
  [BracketInfo.TOP16]: 16,
};

export function buildBracket(
  matches: TournamentMatch[],
  decks: TournamentDeckResponse[],
  top: BracketInfo,
  limited = false,
): MatchData[][] | null {
  if (!matches.length || top === BracketInfo.NONE) return null;
  const players = new Map(decks.map(deck => [deck.tournamentDeck.meleePlayerUsername, deck]));
  const rounds = [...new Set(matches.map(match => match.round))].sort((a, b) => b - a);
  const requiredRounds = Math.log2(bracketInfoToNumber[top]);
  const processed: MatchData[][] = [];
  // Preserve legacy constructed forfeit results. Limited imports use a zero
  // score for double forfeits, which have no winner to highlight or advance.
  const winnerUsername = (match: TournamentMatch) =>
    match.result === 3
      ? match.p1Username
      : match.result === 0 && (!limited || match.gameWin + match.gameLose > 0)
        ? match.p2Username
        : null;

  // Work backwards from the final; each winner feeds the corresponding next-round slot.
  for (let index = 0; index < requiredRounds; index++) {
    const candidates = matches.filter(match => match.round === rounds[index] && !match.isBye);
    const ordered: TournamentMatch[] = [];
    for (const next of processed[index - 1] ?? []) {
      for (const username of [next.p1Username, next.p2Username]) {
        if (!username) continue;
        const previous = candidates.find(match => winnerUsername(match) === username);
        if (previous && !ordered.includes(previous)) ordered.push(previous);
      }
    }
    ordered.push(...candidates.filter(match => !ordered.includes(match)));
    processed.push(
      ordered.map(match => ({
        round: match.round,
        match,
        player1: players.get(match.p1Username) ?? null,
        player2: (match.p2Username && players.get(match.p2Username)) || null,
        winnerUsername: winnerUsername(match),
        p1Username: match.p1Username,
        p2Username: match.p2Username,
        gameWins: match.gameWin,
        gameLosses: match.gameLose,
        gameDraws: match.gameDraw,
      })),
    );
  }
  return processed.reverse();
}
