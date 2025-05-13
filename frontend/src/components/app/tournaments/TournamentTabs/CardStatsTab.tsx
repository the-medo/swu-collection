import * as React from 'react';
import { CardStatsTabs } from '@/components/app/card-stats';
import TournamentDeckKeyFloater, {
  TournamentDeckKeyFloaterRoutes,
} from '@/components/app/tournaments/TournamentDecks/TournamentDeckKeyFloater.tsx';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { useEffect } from 'react';
import TournamentDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentDataLoader.tsx';

interface CardStatsTabProps {
  tournamentIds: string[];
  metaId?: number;
  route: TournamentDeckKeyFloaterRoutes;
}

const CardStatsTab: React.FC<CardStatsTabProps> = ({ tournamentIds, metaId, route }) => {
  const { setTournamentIds } = useTournamentMetaActions();

  useEffect(() => {
    setTournamentIds(tournamentIds);
  }, [tournamentIds, setTournamentIds]);

  const tournamentId = !metaId ? tournamentIds[0] : undefined;

  return (
    <>
      {tournamentIds.map(tid => (
        <TournamentDataLoader tournamentId={tid} key={tid} />
      ))}
      <CardStatsTabs tournamentId={tournamentId} metaId={metaId} />
      <TournamentDeckKeyFloater route={route} />
    </>
  );
};

export default CardStatsTab;
