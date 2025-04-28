import { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';

export type MatchData = {
  round: number;
  match: TournamentMatch;
  player1: TournamentDeckResponse;
  player2: TournamentDeckResponse | null;
  winner: TournamentDeckResponse | null;
  p1Username: string;
  p2Username: string | null;
  gameWins: number;
  gameLosses: number;
  gameDraws: number;
};
