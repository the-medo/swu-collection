import type { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';

export type MatchData = {
  round: number;
  match: TournamentMatch;
  player1: TournamentDeckResponse | null;
  player2: TournamentDeckResponse | null;
  winnerUsername: string | null;
  p1Username: string;
  p2Username: string | null;
  gameWins: number;
  gameLosses: number;
  gameDraws: number;
};
