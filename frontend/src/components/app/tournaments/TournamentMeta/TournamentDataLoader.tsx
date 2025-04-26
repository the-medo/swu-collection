import * as React from 'react';
import { useGetTournamentDecks } from '@/api/tournaments/useGetTournamentDecks.ts';
import { useGetTournamentMatches } from '@/api/tournaments/useGetTournamentMatches.ts';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { useEffect } from 'react';
import { TournamentAnalyzerData } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useGetTournament } from '@/api/tournaments/useGetTournament';

interface TournamentDataLoaderProps {
  tournamentId: string;
}

const TournamentDataLoader: React.FC<TournamentDataLoaderProps> = ({ tournamentId }) => {
  const { data: decksData, isLoading: isLoadingDecks } = useGetTournamentDecks(tournamentId);
  const { data: matchesData, isLoading: isLoadingMatches } = useGetTournamentMatches(tournamentId);
  const { data: tournamentData, isLoading: isLoadingTournament } = useGetTournament(tournamentId);

  const { setTournamentData } = useTournamentMetaActions();

  useEffect(() => {
    if (
      !isLoadingDecks &&
      !isLoadingMatches &&
      !isLoadingTournament &&
      decksData &&
      matchesData &&
      tournamentData
    ) {
      const data: TournamentAnalyzerData = {
        decks: decksData.data,
        matches: matchesData.data,
        info: { [tournamentId]: tournamentData },
      };

      setTournamentData(tournamentId, data);
    }
  }, [
    isLoadingDecks,
    isLoadingMatches,
    isLoadingTournament,
    decksData,
    matchesData,
    tournamentData,
  ]);

  return null;
};

export default TournamentDataLoader;
