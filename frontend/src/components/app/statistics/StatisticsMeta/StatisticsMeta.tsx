import * as React from 'react';
import { useMemo, useState } from 'react';
import { useGameResultsContext } from '@/components/app/statistics/GameResultsContext.tsx';
import StatisticsMetaPieChart from '@/components/app/statistics/StatisticsMeta/StatisticsMetaPieChart.tsx';
import StatisticsMetaBarChart from '@/components/app/statistics/StatisticsMeta/StatisticsMetaBarChart.tsx';
import ViewModeSelector, {
  ViewMode,
} from '@/components/app/tournaments/TournamentMeta/ViewModeSelector.tsx';
import MobileCard from '@/components/ui/mobile-card.tsx';
import MatchResultStatsTable from '@/components/app/statistics/common/MatchResultStatsTable/MatchResultStatsTable.tsx';
import {
  analyzeStatisticsMeta,
  getPlayerMetaKey,
  toOpponentPerspectiveMatchResult,
  unknownOpponentMetaKey,
} from '@/components/app/statistics/StatisticsMeta/statisticsMetaLib.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';

const metaInfo: MetaInfo = 'leadersAndBase';

const StatisticsMeta: React.FC = () => {
  const gameResultData = useGameResultsContext();
  const labelRenderer = useLabel();
  const [viewMode, setViewMode] = useState<ViewMode>('chart');

  const matches = gameResultData?.matches.array;
  const analysisData = useMemo(() => analyzeStatisticsMeta(matches ?? []), [matches]);
  const opponentPerspectiveMatches = useMemo(
    () => (matches ?? []).map(match => toOpponentPerspectiveMatchResult(match)),
    [matches],
  );
  const totalMatches = matches?.length ?? 0;
  const hasUnknownBucket = analysisData.some(item => item.key === unknownOpponentMetaKey);

  if (!gameResultData) {
    return null;
  }

  if (totalMatches === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        No opponent meta available for the selected filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-row gap-2 flex-wrap justify-between">
        <MobileCard>
          <ViewModeSelector value={viewMode} onChange={setViewMode} />
        </MobileCard>
      </div>

      <div className="flex items-center gap-4 flex-wrap justify-between">
        <span className="text-[10px] w-auto">Total matches analyzed: {totalMatches}</span>
        <span className="text-[10px] w-auto">Unique opponent decks: {analysisData.length}</span>
        <div className="flex items-center text-[12px] w-auto">
          <span>This view groups the filtered matches by the opponent&apos;s deck.</span>
          <InfoTooltip
            tooltip={
              <div className="flex flex-col gap-2">
                <div>
                  Match and game records are shown from the grouped opponent&apos;s point of view. A{' '}
                  <span className="font-medium">4W-2L</span> match record means that opponent deck
                  beat the filtered player or team four times and lost twice.
                </div>
                <div>
                  Counts and percentages still show how often each opponent leader/base combination
                  appeared in the filtered matches.
                </div>
              </div>
            }
          />
        </div>
        {hasUnknownBucket && (
          <span className="text-[10px] text-muted-foreground">
            Opponents missing leader/base data are grouped as Unknown.
          </span>
        )}
      </div>

      {viewMode === 'chart' ? (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <StatisticsMetaPieChart analysisData={analysisData} totalMatches={totalMatches} />
          </div>
          <div className="w-full md:w-1/2">
            <StatisticsMetaBarChart analysisData={analysisData} totalMatches={totalMatches} />
          </div>
        </div>
      ) : (
        <MatchResultStatsTable
          matches={opponentPerspectiveMatches}
          keyFunction={getPlayerMetaKey}
          labelFunction={key => labelRenderer(key, metaInfo, 'compact')}
          labelHeader="Opponent Leader & Base"
          emptyMessage="No opponent meta available for the selected filters."
        />
      )}
    </div>
  );
};

export default StatisticsMeta;
