import * as React from 'react';
import TournamentMeta from '@/components/app/tournaments/TournamentMeta/TournamentMeta.tsx';
import TournamentDeckKeyFloater, {
  TournamentDeckKeyFloaterRoutes,
} from '@/components/app/tournaments/TournamentDecks/TournamentDeckKeyFloater.tsx';
import { Helmet } from 'react-helmet-async';

interface MetaAnalysisTabProps {
  /**
   * Used for redirect in TournamentDeckKeyFloater
   */
  route: TournamentDeckKeyFloaterRoutes;
}

const MetaAnalysisTab: React.FC<MetaAnalysisTabProps> = ({ route }) => {
  return (
    <>
      <Helmet title="Meta Analysis" />
      <div className="space-y-2">
        <TournamentMeta />
        <TournamentDeckKeyFloater route={route} />
      </div>
    </>
  );
};

export default MetaAnalysisTab;
