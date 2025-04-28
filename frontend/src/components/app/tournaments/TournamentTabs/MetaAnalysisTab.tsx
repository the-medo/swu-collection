import * as React from 'react';
import TournamentMeta from '@/components/app/tournaments/TournamentMeta/TournamentMeta.tsx';
import { useMemo } from 'react';

interface MetaAnalysisTabProps {
  tournamentId: string;
}

const MetaAnalysisTab: React.FC<MetaAnalysisTabProps> = ({ tournamentId }) => {
  const tournamentIds = useMemo(() => [tournamentId], [tournamentId]);

  return (
    <div className="space-y-2">
      <TournamentMeta tournamentIds={tournamentIds} />
    </div>
  );
};

export default MetaAnalysisTab;
