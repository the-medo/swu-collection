import * as React from 'react';
import { useTournamentMetaStore } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import TournamentDeckFilters from '../TournamentDecks/TournamentDeckFilters.tsx';
import TournamentDeckTable from '../TournamentDecks/TournamentDeckTable.tsx';
import { Helmet } from 'react-helmet-async';
import { useMemo } from 'react';
import TournamentTopLeaderDecks from '../TournamentDecks/TournamentTopLeaderDecks.tsx';
import { getTopLeaderDecks } from '../TournamentDecks/topLeaderDecks.ts';

interface AllDecksTabProps {
  compact?: boolean;
  showTopLeaders?: boolean;
  tournamentId?: string;
}

const AllDecksTab: React.FC<AllDecksTabProps> = ({
  compact,
  showTopLeaders = false,
  tournamentId,
}) => {
  const { decks, isLoaded, tournamentIds } = useTournamentMetaStore();
  const isCurrentTournament =
    !tournamentId || (tournamentIds.length === 1 && tournamentIds[0] === tournamentId);
  const topLeaderDecks = useMemo(
    () => (showTopLeaders ? getTopLeaderDecks(decks) : []),
    [decks, showTopLeaders],
  );
  const topLeaderDeckIds = useMemo(
    () => new Set(topLeaderDecks.map(deck => deck.deckId)),
    [topLeaderDecks],
  );

  return (
    <>
      <Helmet title="Decks" />
      <div className="space-y-2">
        {isLoaded && isCurrentTournament ? (
          <>
            <TournamentDeckFilters />
            {showTopLeaders && <TournamentTopLeaderDecks decks={topLeaderDecks} />}
            <TournamentDeckTable
              decks={decks}
              deckIdSearchParam="maDeckId"
              compact={compact}
              autoSelectFirstDeck={showTopLeaders}
              topLeaderDeckIds={topLeaderDeckIds}
            />
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
