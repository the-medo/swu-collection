import * as React from 'react';
import { CardStatsTabs } from '@/components/app/card-stats';
import { TournamentDeckKeyFloaterRoutes } from '@/components/app/tournaments/TournamentDecks/TournamentDeckKeyFloater.tsx';
import { useTournamentMetaActions } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { useEffect } from 'react';
import TournamentDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentDataLoader.tsx';
import { Helmet } from 'react-helmet-async';

interface CardStatsTabProps {
  tournamentIds: string[];
  metaId?: number;
  route: TournamentDeckKeyFloaterRoutes;
}

const CardStatsTab: React.FC<CardStatsTabProps> = ({ tournamentIds, metaId }) => {
  const { setTournamentIds } = useTournamentMetaActions();

  useEffect(() => {
    setTournamentIds(tournamentIds);
  }, [tournamentIds, setTournamentIds]);

  const tournamentId = !metaId ? tournamentIds[0] : undefined;

  return (
    <>
      <Helmet title="Card Stats" />
      {tournamentIds.map(tid => (
        <TournamentDataLoader tournamentId={tid} key={tid} />
      ))}
      <CardStatsTabs tournamentId={tournamentId} metaId={metaId} />
    </>
  );
};

export default CardStatsTab;
