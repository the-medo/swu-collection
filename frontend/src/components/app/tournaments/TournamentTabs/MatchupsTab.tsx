import * as React from 'react';
import { useMemo } from 'react';
import TournamentMatchups from '@/components/app/tournaments/TournamentMatchups/TournamentMatchups.tsx';
import {
  useTournamentMetaActions,
  useTournamentMetaStore,
} from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import TournamentDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentDataLoader.tsx';
import TournamentDeckKeyFloater, {
  TournamentDeckKeyFloaterRoutes,
} from '@/components/app/tournaments/TournamentDecks/TournamentDeckKeyFloater.tsx';

interface MatchupsTabProps {
  tournamentIds: string[];
  /**
   * Used for redirect in TournamentDeckKeyFloater
   */
  route: TournamentDeckKeyFloaterRoutes;
}

const MatchupsTab: React.FC<MatchupsTabProps> = ({ tournamentIds, route }) => {
  const { decks, tournaments, matches } = useTournamentMetaStore();
  const { setTournamentIds } = useTournamentMetaActions();

  React.useEffect(() => {
    setTournamentIds(tournamentIds);
  }, [tournamentIds, setTournamentIds]);

  return (
    <div className="space-y-2 px-2">
      {tournamentIds.map(tid => (
        <TournamentDataLoader tournamentId={tid} key={tid} />
      ))}
      <TournamentMatchups decks={decks} tournaments={tournaments} matches={matches} />
      <TournamentDeckKeyFloater route={route} />
    </div>
  );
};

export default MatchupsTab;
