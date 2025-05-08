import * as React from 'react';
import TournamentMeta from '@/components/app/tournaments/TournamentMeta/TournamentMeta.tsx';
import { useMemo } from 'react';
import TournamentDeckKeyFloater, {
  TournamentDeckKeyFloaterRoutes,
} from '@/components/app/tournaments/TournamentDecks/TournamentDeckKeyFloater.tsx';

interface MetaAnalysisTabProps {
  tournamentIds: string[];
  /**
   * Used for redirect in TournamentDeckKeyFloater
   */
  route: TournamentDeckKeyFloaterRoutes;
}

const MetaAnalysisTab: React.FC<MetaAnalysisTabProps> = ({ tournamentIds, route }) => {
  return (
    <div className="space-y-2">
      <TournamentMeta tournamentIds={tournamentIds} />
      <TournamentDeckKeyFloater route={route} />
    </div>
  );
};

export default MetaAnalysisTab;
