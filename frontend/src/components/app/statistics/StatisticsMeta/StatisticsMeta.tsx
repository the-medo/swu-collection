import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useGameResultsContext } from '@/components/app/statistics/GameResultsContext.tsx';
import StatisticsMetaPieChart from '@/components/app/statistics/StatisticsMeta/StatisticsMetaPieChart.tsx';
import StatisticsMetaBarChart from '@/components/app/statistics/StatisticsMeta/StatisticsMetaBarChart.tsx';
import ViewModeSelector, {
  ViewMode,
} from '@/components/app/tournaments/TournamentMeta/ViewModeSelector.tsx';
import MetaInfoSelector, {
  MetaInfo,
} from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import MobileCard from '@/components/ui/mobile-card.tsx';
import MatchResultStatsTable from '@/components/app/statistics/common/MatchResultStatsTable/MatchResultStatsTable.tsx';
import {
  analyzeStatisticsMeta,
  getPlayerMetaKeys,
  toOpponentPerspectiveMatchResult,
  unknownOpponentMetaKey,
} from '@/components/app/statistics/StatisticsMeta/statisticsMetaLib.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import InfoTooltip from '@/components/app/global/InfoTooltip/InfoTooltip.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCardList } from '@/api/lists/useCardList.ts';

const defaultMetaInfo: MetaInfo = 'leadersAndBase';

const labelHeaderByMetaInfo: Record<MetaInfo, string> = {
  leaders: 'Opponent Leader',
  leadersAndBase: 'Opponent Leader & Base',
  bases: 'Opponent Base',
  aspects: 'Opponent Aspect',
  aspectsBase: 'Opponent Base Aspect',
  aspectsDetailed: 'Opponent Aspect Mix',
  sets: 'Opponent Leader Set',
};

const groupingDescriptionByMetaInfo: Record<MetaInfo, string> = {
  leaders: "the opponent's leader",
  leadersAndBase: "the opponent's leader/base combination",
  bases: "the opponent's base",
  aspects: "the opponent's aspects",
  aspectsBase: "the opponent's base aspect",
  aspectsDetailed: "the opponent's full aspect mix",
  sets: "the set of the opponent's leader",
};

const StatisticsMeta: React.FC = () => {
  const gameResultData = useGameResultsContext();
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const { data: cardListData } = useCardList();
  const labelRenderer = useLabel();
  const viewMode = (search.sMetaViewMode as ViewMode) || 'chart';
  const metaInfo = (search.sMetaInfo as MetaInfo) || defaultMetaInfo;

  const setViewMode = useCallback(
    (value: ViewMode) => {
      navigate({
        to: '.',
        search: prev => ({ ...prev, sMetaViewMode: value }),
      });
    },
    [navigate],
  );

  const setMetaInfo = useCallback(
    (value: MetaInfo) => {
      navigate({
        to: '.',
        search: prev => ({ ...prev, sMetaInfo: value }),
      });
    },
    [navigate],
  );

  const matches = gameResultData?.matches.array;
  const analysisData = useMemo(
    () => analyzeStatisticsMeta(matches ?? [], metaInfo, cardListData),
    [cardListData, matches, metaInfo],
  );
  const opponentPerspectiveMatches = useMemo(
    () => (matches ?? []).map(match => toOpponentPerspectiveMatchResult(match)),
    [matches],
  );
  const totalMatches = matches?.length ?? 0;
  const hasUnknownBucket = analysisData.some(item => item.key === unknownOpponentMetaKey);
  const groupingDescription = groupingDescriptionByMetaInfo[metaInfo];

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
        <MobileCard>
          <MetaInfoSelector value={metaInfo} onChange={setMetaInfo} />
        </MobileCard>
      </div>

      <div className="flex items-center gap-4 flex-wrap justify-between">
        <span className="text-[10px] w-auto">Total matches analyzed: {totalMatches}</span>
        <span className="text-[10px] w-auto">Unique opponent groups: {analysisData.length}</span>
        <div className="flex items-center text-[12px] w-auto">
          <span>This view groups the filtered matches by {groupingDescription}.</span>
          <InfoTooltip
            tooltip={
              <div className="flex flex-col gap-2">
                <div>
                  Match and game records are shown from the grouped opponent&apos;s point of view. A{' '}
                  <span className="font-medium">4W-2L</span> match record means that grouped
                  opponent entry beat the filtered player or team four times and lost twice.
                </div>
                <div>
                  Counts and percentages show how often each grouped opponent entry appeared in the
                  filtered matches.
                </div>
                {metaInfo === 'aspects' && (
                  <div>
                    Decks with repeated aspects can contribute to the same aspect bucket more than
                    once, so percentages can add up to more than 100%.
                  </div>
                )}
              </div>
            }
          />
        </div>
        {hasUnknownBucket && (
          <span className="text-[10px] text-muted-foreground">
            Opponents missing the deck data needed for this grouping are shown as Unknown.
          </span>
        )}
        {metaInfo === 'aspects' && (
          <span className="text-[10px] text-muted-foreground">
            Double-aspect decks can count more than once in aspect grouping.
          </span>
        )}
      </div>

      {viewMode === 'chart' ? (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <StatisticsMetaPieChart
              analysisData={analysisData}
              metaInfo={metaInfo}
              totalMatches={totalMatches}
            />
          </div>
          <div className="w-full md:w-1/2">
            <StatisticsMetaBarChart
              analysisData={analysisData}
              metaInfo={metaInfo}
              totalMatches={totalMatches}
            />
          </div>
        </div>
      ) : (
        <MatchResultStatsTable
          matches={opponentPerspectiveMatches}
          keyFunction={match => getPlayerMetaKeys(match, metaInfo, cardListData)}
          labelFunction={key => labelRenderer(key, metaInfo, 'compact')}
          labelHeader={labelHeaderByMetaInfo[metaInfo]}
          emptyMessage="No opponent meta available for the selected filters."
        />
      )}
    </div>
  );
};

export default StatisticsMeta;
