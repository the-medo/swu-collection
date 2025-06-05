import * as React from 'react';
import { useEffect } from 'react';
import { useGetBulkTournaments } from '@/api/tournaments/useGetBulkTournaments';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { TournamentAnalyzerData } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { TournamentData } from '../../../../../../types/Tournament.ts';

interface TournamentsDataLoaderProps {
  tournaments: TournamentData[];
}

const TournamentsDataLoader: React.FC<TournamentsDataLoaderProps> = ({ tournaments }) => {
  const { data, isLoading } = useGetBulkTournaments(tournaments);
  const { setTournamentData } = useTournamentMetaActions();

  useEffect(() => {
    if (!isLoading && data && tournaments) {
      // Process each tournament's data
      for (const tournamentData of tournaments) {
        const tournamentId = tournamentData.tournament.id;

        // Skip tournaments without necessary data
        if (!tournamentId || !tournamentData.tournament.imported) {
          continue;
        }

        // Get matches and decks for this tournament
        const matches = data.matches?.[tournamentId];
        const decks = data.decks?.[tournamentId];

        // Skip if either matches or decks are missing
        if (!matches || !decks) {
          continue;
        }

        // Create the tournament analyzer data
        const analyzerData: TournamentAnalyzerData = {
          decks: decks,
          matches: matches,
          info: { [tournamentId]: tournamentData },
        };

        // Save the data to the tournament meta store
        setTournamentData(tournamentId, analyzerData);
      }
    }
  }, [isLoading, data, tournaments, setTournamentData]);

  return null;
};

export default TournamentsDataLoader;
