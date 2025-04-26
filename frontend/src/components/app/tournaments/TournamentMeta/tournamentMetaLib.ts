import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import { TournamentData } from '../../../../../../types/Tournament.ts';

export type TournamentInfoMap = Record<string, TournamentData>;

export type TournamentAnalyzerData = {
  decks: TournamentDeckResponse[];
  matches: TournamentMatch[];
  info: TournamentInfoMap;
};

export type TournamentDataMap = Record<string, TournamentAnalyzerData | undefined>;
