import * as React from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentInfoMap } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';

interface TournamentMetaAnalyzerProps {
  decks: TournamentDeckResponse[];
  tournaments: TournamentInfoMap;
}

const TournamentMetaAnalyzer: React.FC<TournamentMetaAnalyzerProps> = ({ decks, tournaments }) => {
  return <div></div>;
};

export default TournamentMetaAnalyzer;
