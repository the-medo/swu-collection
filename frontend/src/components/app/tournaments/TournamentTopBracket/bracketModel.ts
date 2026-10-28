import type { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks';
import { BracketInfo } from '../../../../../../types/enums.ts';
import type { MatchData } from '../lib/tournamentLib';
import { bracketInfoToNumber, buildBracket as buildTournamentBracket } from './buildBracket';

export const bracketSize = bracketInfoToNumber;
export type BracketMatch = MatchData;
export const winnerUsername = (entry: BracketMatch) => entry.winnerUsername;
export const roundName = (index: number, roundCount: number) =>
  ['Final', 'Semifinals', 'Quarterfinals', 'Round of 16'][roundCount - index - 1] ??
  `Round ${index + 1}`;
export const placementLabel = (placement: number | null) => {
  if (placement === 1) return 'Champion';
  if (placement === 2) return 'Finalist';
  if (placement === 3 || placement === 4) return 'Top 4';
  if (placement && placement <= 8) return 'Top 8';
  if (placement && placement <= 16) return 'Top 16';
  return 'Unplaced';
};

export function buildBracket(
  matches: TournamentMatch[],
  decks: TournamentDeckResponse[],
  top: BracketInfo,
  limited = false,
): BracketMatch[][] {
  return buildTournamentBracket(matches, decks, top, limited) ?? [];
}
