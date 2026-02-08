import { MatchResult, StatisticsHistoryData } from '@/components/app/statistics/useGameResults.ts';
import { useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';
import { calculateDeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import * as React from 'react';
import StatisticsSubpageTabs from '@/components/app/statistics/components/StatisticsSubpageTabs/StatisticsSubpageTabs.tsx';
import SubpageMatches from '@/components/app/statistics/components/SubpageMatches/SubpageMatches.tsx';
import SubpageCardStats from '@/components/app/statistics/components/SubpageCardStats/SubpageCardStats.tsx';
import SubpageMatchups from '@/components/app/statistics/components/SubpageMatchups/SubpageMatchups.tsx';
import SubpageDecklist from '@/components/app/statistics/components/SubpageDecklist/SubpageDecklist.tsx';
import LeaderBaseInfoThumbnail, {
  LeaderBaseInfoThumbnailProps,
} from '@/components/app/statistics/StatisticsDashboard/DashboardLeaderBase/LeaderBaseInfoThumbnail.tsx';

interface StatisticsLeaderBaseDetailProps {
  matches: MatchResult[];
  byDeckId: StatisticsHistoryData['matches']['byDeckId'];
}

const StatisticsLeaderBaseDetail: React.FC<StatisticsLeaderBaseDetailProps> = ({
  matches = [],
  byDeckId,
}) => {
  const { sLeaderCardId, sBaseCardKey, sSubpage } = useSearch({ strict: false });
  const key = `${sLeaderCardId}|${sBaseCardKey}`;

  const { leaderBaseStatistics, deckStatistics } = useMemo(() => {
    const deckStatistics: LeaderBaseInfoThumbnailProps['deckStatistics'] = {};
    matches.forEach(match => {
      if (match.deckId && !deckStatistics[match.deckId]) {
        deckStatistics[match.deckId] = calculateDeckStatistics(
          match.deckId,
          byDeckId.matches[match.deckId],
        );
      }
    });
    return { leaderBaseStatistics: calculateDeckStatistics(key, matches), deckStatistics };
  }, [key, matches]);

  if (!leaderBaseStatistics) {
    return <>Unknown deck</>;
  }

  return (
    <>
      <LeaderBaseInfoThumbnail
        statistics={leaderBaseStatistics}
        statSectionVariant="horizontal"
        deckStatistics={deckStatistics}
      />
      <StatisticsSubpageTabs className="mt-4" type="leader-base" />
      <div className="mt-4">
        {sSubpage === 'matches' && <SubpageMatches matches={matches} />}
        {sSubpage === 'card-stats' && <SubpageCardStats matches={matches} />}
        {sSubpage === 'matchups' && <SubpageMatchups matches={matches} />}
        {!sSubpage && <SubpageMatches matches={matches} />}
      </div>
    </>
  );
};

export default StatisticsLeaderBaseDetail;
