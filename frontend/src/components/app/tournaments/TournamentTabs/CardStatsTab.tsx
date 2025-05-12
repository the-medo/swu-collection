import * as React from 'react';
import { CardStatsTabs } from '@/components/app/card-stats';
import TournamentDeckKeyFloater, {
  TournamentDeckKeyFloaterRoutes,
} from '@/components/app/tournaments/TournamentDecks/TournamentDeckKeyFloater.tsx';

interface CardStatsTabProps {
  tournamentId?: string;
  metaId?: number;
  route: TournamentDeckKeyFloaterRoutes;
}

const CardStatsTab: React.FC<CardStatsTabProps> = ({ tournamentId, metaId, route }) => {
  return (
    <>
      <CardStatsTabs tournamentId={tournamentId} metaId={metaId} />
      <TournamentDeckKeyFloater route={route} />
    </>
  );
};

export default CardStatsTab;
