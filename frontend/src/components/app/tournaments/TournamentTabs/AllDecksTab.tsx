import * as React from 'react';
import { useEffect } from 'react';
import {
  useTournamentMetaActions,
  useTournamentMetaStore,
} from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import TournamentDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentDataLoader.tsx';
import TournamentDeckFilters from '../TournamentDecks/TournamentDeckFilters.tsx';
import TournamentDeckTable from '../TournamentDecks/TournamentDeckTable.tsx';

interface AllDecksTabProps {
  tournamentId: string;
}

const AllDecksTab: React.FC<AllDecksTabProps> = ({ tournamentId }) => {
  const { decks, isLoaded } = useTournamentMetaStore();
  const { setTournamentIds } = useTournamentMetaActions();

  useEffect(() => {
    setTournamentIds([tournamentId]);
  }, [tournamentId]);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-md border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">All Decks</h3>

        {/* Tournament data loader */}
        <TournamentDataLoader tournamentId={tournamentId} />

        {isLoaded ? (
          <>
            {/* Filters */}
            <TournamentDeckFilters />

            {/* Decks table */}
            <TournamentDeckTable decks={decks} />
          </>
        ) : (
          <div className="bg-muted p-8 rounded-md text-center">
            <p className="text-muted-foreground">Loading tournament decks...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllDecksTab;
