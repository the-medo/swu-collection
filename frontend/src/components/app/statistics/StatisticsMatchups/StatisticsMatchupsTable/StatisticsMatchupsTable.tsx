import * as React from 'react';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { useAnalyzeMatchups } from '@/components/app/statistics/lib/useAnalyzeMatchups.ts';
import MatchupTable from '@/components/app/tournaments/TournamentMatchups/components/MatchupTable.tsx';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import DisplayModeSelector from '@/components/app/tournaments/TournamentMatchups/components/DisplayModeSelector.tsx';
import MobileCard from '@/components/ui/mobile-card.tsx';
import { MatchupDisplayMode } from '@/components/app/tournaments/TournamentMatchups/types.ts';
import { useNavigate, useSearch } from '@tanstack/react-router';

interface StatisticsMatchupsTableProps {
  matches: MatchResult[];
}

const StatisticsMatchupsTable: React.FC<StatisticsMatchupsTableProps> = ({ matches }) => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  const displayMode = (search.maDisplayMode as MatchupDisplayMode) || 'winLoss';

  const data = useAnalyzeMatchups(matches);
  const labelRenderer = useLabel();

  const setDisplayMode = (value: MatchupDisplayMode) => {
    navigate({
      to: '.',
      search: prev => ({ ...prev, maDisplayMode: value }),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 flex-wrap items-start justify-between">
        <MobileCard>
          <DisplayModeSelector value={displayMode} onChange={setDisplayMode} />
        </MobileCard>
      </div>
      <MatchupTable
        matchupData={data}
        displayMode={displayMode}
        metaInfo="leadersAndBase"
        totalMatchesAnalyzed={matches.length}
        labelRenderer={labelRenderer}
      />
    </div>
  );
};

export default StatisticsMatchupsTable;
