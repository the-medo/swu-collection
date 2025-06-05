import TournamentMatchups from '@/components/app/tournaments/TournamentMatchups/TournamentMatchups.tsx';
import { useTournamentMetaStore } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import TournamentDeckKeyFloater, {
  TournamentDeckKeyFloaterRoutes,
} from '@/components/app/tournaments/TournamentDecks/TournamentDeckKeyFloater.tsx';
import { Helmet } from 'react-helmet-async';
import * as React from 'react';

interface MatchupsTabProps {
  /**
   * Used for redirect in TournamentDeckKeyFloater
   */
  route: TournamentDeckKeyFloaterRoutes;
}

const MatchupsTab: React.FC<MatchupsTabProps> = ({ route }) => {
  const { decks, tournaments, matches } = useTournamentMetaStore();

  return (
    <>
      <Helmet title="Matchups" />
      <div className="space-y-2 px-2">
        <TournamentMatchups decks={decks} tournaments={tournaments} matches={matches} />
        <TournamentDeckKeyFloater route={route} />
      </div>
    </>
  );
};

export default MatchupsTab;
