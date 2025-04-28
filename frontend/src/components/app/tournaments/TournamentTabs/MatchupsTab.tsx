import * as React from 'react';
import { useMemo } from 'react';
import TournamentMatchups from '@/components/app/tournaments/TournamentMatchups/TournamentMatchups.tsx';
import {
  useTournamentMetaActions,
  useTournamentMetaStore,
} from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import TournamentDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentDataLoader.tsx';

interface MatchupsTabProps {
  tournamentId: string;
}

const MatchupsTab: React.FC<MatchupsTabProps> = ({ tournamentId }) => {
  const { decks, tournaments, matches } = useTournamentMetaStore();
  const { setTournamentIds } = useTournamentMetaActions();
  const tournamentIds = useMemo(() => [tournamentId], [tournamentId]);

  React.useEffect(() => {
    setTournamentIds(tournamentIds);
  }, [tournamentIds, setTournamentIds]);

  return (
    <div className="space-y-2 px-2">
      {tournamentIds.map(tid => (
        <TournamentDataLoader tournamentId={tid} key={tid} />
      ))}
      <TournamentMatchups decks={decks} tournaments={tournaments} matches={matches} />
    </div>
  );
};

export default MatchupsTab;
