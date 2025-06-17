import * as React from 'react';
import { CardStatsTabs } from '@/components/app/card-stats';
import { TournamentDeckKeyFloaterRoutes } from '@/components/app/tournaments/TournamentDecks/TournamentDeckKeyFloater.tsx';
import { Helmet } from 'react-helmet-async';

interface CardStatsTabProps {
  tournamentId?: string;
  metaId?: number;
  tournamentGroupId?: string;
  route: TournamentDeckKeyFloaterRoutes;
}

const CardStatsTab: React.FC<CardStatsTabProps> = ({ tournamentId, metaId, tournamentGroupId }) => {
  const tid = !metaId && !tournamentGroupId ? tournamentId : undefined;

  return (
    <>
      <Helmet title="Card Stats" />
      <CardStatsTabs tournamentId={tid} metaId={metaId} tournamentGroupId={tournamentGroupId} />
    </>
  );
};

export default CardStatsTab;
