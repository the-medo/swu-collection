import * as React from 'react';
import TournamentMeta from '@/components/app/tournaments/TournamentMeta/TournamentMeta.tsx';
import TournamentDeckKeyFloater, {
  TournamentDeckKeyFloaterRoutes,
} from '@/components/app/tournaments/TournamentDecks/TournamentDeckKeyFloater.tsx';
import { Helmet } from 'react-helmet-async';

interface MetaAnalysisTabProps {
  tournamentIds: string[];
  /**
   * Used for redirect in TournamentDeckKeyFloater
   */
  route: TournamentDeckKeyFloaterRoutes;
}

const MetaAnalysisTab: React.FC<MetaAnalysisTabProps> = ({ tournamentIds, route }) => {
  return (
    <>
      <Helmet title="Meta Analysis" />
      <div className="space-y-2">
        <TournamentMeta tournamentIds={tournamentIds} />
        <TournamentDeckKeyFloater route={route} />
      </div>
    </>
  );
};

export default MetaAnalysisTab;
