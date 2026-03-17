import * as React from 'react';
import { useMemo } from 'react';
import { useGameResultsContext } from '@/components/app/statistics/GameResultsContext.tsx';
import StatisticsMetaPieChart from '@/components/app/statistics/StatisticsMeta/StatisticsMetaPieChart.tsx';
import StatisticsMetaBarChart from '@/components/app/statistics/StatisticsMeta/StatisticsMetaBarChart.tsx';
import {
  analyzeStatisticsMeta,
  unknownOpponentMetaKey,
} from '@/components/app/statistics/StatisticsMeta/statisticsMetaLib.ts';

const StatisticsMeta: React.FC = () => {
  const gameResultData = useGameResultsContext();

  const matches = gameResultData?.matches.array;
  const analysisData = useMemo(
    () => analyzeStatisticsMeta(gameResultData?.matches.array ?? []),
    [gameResultData?.matches.array],
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
      <div className="flex items-center gap-4 flex-wrap justify-between">
        <span className="text-[10px] w-auto">Total matches analyzed: {totalMatches}</span>
        <span className="text-[10px] w-auto">Unique opponent decks: {analysisData.length}</span>
        {hasUnknownBucket && (
          <span className="text-[10px] text-muted-foreground">
            Opponents missing leader/base data are grouped as Unknown.
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <StatisticsMetaPieChart analysisData={analysisData} totalMatches={totalMatches} />
        </div>
        <div className="w-full md:w-1/2">
          <StatisticsMetaBarChart analysisData={analysisData} totalMatches={totalMatches} />
        </div>
      </div>
    </div>
  );
};

export default StatisticsMeta;
