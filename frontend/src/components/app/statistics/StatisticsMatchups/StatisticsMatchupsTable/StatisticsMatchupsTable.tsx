import * as React from 'react';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { useAnalyzeMatchups } from '@/components/app/statistics/lib/useAnalyzeMatchups.ts';
import MatchupTable from '@/components/app/tournaments/TournamentMatchups/components/MatchupTable.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';

interface StatisticsMatchupsTableProps {
  matches: MatchResult[];
}

const StatisticsMatchupsTable: React.FC<StatisticsMatchupsTableProps> = ({ matches }) => {
  const data = useAnalyzeMatchups(matches);
  const labelRenderer = useLabel();

  return (
    <MatchupTable
      matchupData={data}
      displayMode={'winLoss'}
      metaInfo="leadersAndBase"
      totalMatchesAnalyzed={matches.length}
      labelRenderer={labelRenderer}
    />
  );
};

export default StatisticsMatchupsTable;
