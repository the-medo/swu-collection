import * as React from 'react';
import { useEffect } from 'react';
import {
  useTournamentMetaActions,
  useTournamentMetaStore,
} from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import TournamentDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentDataLoader.tsx';
import TournamentDeckFilters from '../TournamentDecks/TournamentDeckFilters.tsx';
import TournamentDeckTable from '../TournamentDecks/TournamentDeckTable.tsx';
import { Helmet } from 'react-helmet-async';

interface AllDecksTabProps {
  tournamentIds: string[];
}

const AllDecksTab: React.FC<AllDecksTabProps> = ({ tournamentIds }) => {
  const { decks, isLoaded } = useTournamentMetaStore();
  const { setTournamentIds } = useTournamentMetaActions();

  useEffect(() => {
    setTournamentIds(tournamentIds);
  }, [tournamentIds]);

  return (
    <>
      <Helmet title="Decks" />
      <div className="space-y-2">
        {tournamentIds.map(tid => (
          <TournamentDataLoader tournamentId={tid} key={tid} />
        ))}
        {isLoaded ? (
          <>
            <TournamentDeckFilters />
            <TournamentDeckTable decks={decks} />
          </>
        ) : (
          <div className="bg-muted p-8 rounded-md text-center">
            <p className="text-muted-foreground">Loading tournament decks...</p>
          </div>
        )}
      </div>
    </>
  );
};

export default AllDecksTab;
