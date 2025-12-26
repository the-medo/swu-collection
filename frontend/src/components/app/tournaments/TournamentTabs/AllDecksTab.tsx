import * as React from 'react';
import { useTournamentMetaStore } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import TournamentDeckFilters from '../TournamentDecks/TournamentDeckFilters.tsx';
import TournamentDeckTable from '../TournamentDecks/TournamentDeckTable.tsx';
import { Helmet } from 'react-helmet-async';

interface AllDecksTabProps {
  compact?: boolean;
}

const AllDecksTab: React.FC<AllDecksTabProps> = ({ compact }) => {
  const { decks, isLoaded } = useTournamentMetaStore();

  return (
    <>
      <Helmet title="Decks" />
      <div className="space-y-2">
        {isLoaded ? (
          <>
            <TournamentDeckFilters />
            <TournamentDeckTable decks={decks} deckIdSearchParam="maDeckId" compact={compact} />
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
