import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';
import { TournamentData } from '../../../../../../types/Tournament.ts';
import { MetaPart } from '@/components/app/tournaments/TournamentMeta/MetaPartSelector.tsx';

export type TournamentInfoMap = Record<string, TournamentData>;

export type TournamentAnalyzerData = {
  decks: TournamentDeckResponse[];
  matches: TournamentMatch[];
  info: TournamentInfoMap;
};

export type TournamentDataMap = Record<string, TournamentAnalyzerData | undefined>;

export interface AnalysisDataItem {
  key: string;
  count: number;
  data?: {
    all: number;
    top8: number;
    day2: number;
    top64: number;
    conversionTop8: string;
    conversionDay2: string;
    conversionTop64: string;
  };
  percentage?: number;
}

export const getTotalDeckCountBasedOnMetaPart = (
  metaPart: MetaPart | string,
  totalDecks: number,
  day2Decks: number,
) => {
  switch (metaPart) {
    case 'all':
      return totalDecks;
    case 'day2':
      return day2Decks;
    case 'top8':
      return 8;
    case 'top64':
      return 64;
  }
  return 0;
};
