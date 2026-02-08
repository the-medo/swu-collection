import * as React from 'react';
import { StatisticsHistoryData } from '@/components/app/statistics/useGameResults.ts';
import { useMemo } from 'react';
import { calculateDeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import LeaderBaseInfoThumbnail, {
  LeaderBaseInfoThumbnailProps,
} from '@/components/app/statistics/StatisticsDashboard/DashboardLeaderBase/LeaderBaseInfoThumbnail.tsx';

interface StatisticsLeaderBaseListsProps {
  byLeaderBase: StatisticsHistoryData['matches']['byLeaderBase'];
  byDeckId: StatisticsHistoryData['matches']['byDeckId'];
}

const StatisticsLeaderBaseLists: React.FC<StatisticsLeaderBaseListsProps> = ({
  byLeaderBase,
  byDeckId,
}) => {
  const recentCombinations = useMemo(() => {
    if (!byLeaderBase || !byLeaderBase.lastPlayed) return [];

    const comboKeys = Object.keys(byLeaderBase.lastPlayed);

    // Sort by last played date desc
    const sortedComboKeys = comboKeys.sort((a, b) => {
      const dateA = new Date(byLeaderBase.lastPlayed[a]).getTime();
      const dateB = new Date(byLeaderBase.lastPlayed[b]).getTime();
      return dateB - dateA;
    });

    return sortedComboKeys.map(key => {
      const matches = byLeaderBase.matches[key] || [];
      const deckStatistics: LeaderBaseInfoThumbnailProps['deckStatistics'] = {};
      matches.forEach(match => {
        if (match.deckId && !deckStatistics[match.deckId]) {
          deckStatistics[match.deckId] = calculateDeckStatistics(
            match.deckId,
            byDeckId.matches[match.deckId],
          );
        }
      });
      // We use calculateDeckStatistics even if it's not a "deck" per se,
      // as it calculates the same stats (winrate, wins, losses)
      return { leaderBaseStatistics: calculateDeckStatistics(key, matches), deckStatistics };
    });
  }, [byLeaderBase]);

  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: recentCombinations?.length ?? 0,
    initialItemsToLoad: 20,
    itemsPerBatch: 20,
    threshold: 400,
  });

  const visibleCombinations = useMemo(() => {
    if (!recentCombinations) return [];
    return recentCombinations.slice(0, itemsToShow);
  }, [recentCombinations, itemsToShow]);

  if (visibleCombinations.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {visibleCombinations.map(combo => (
        <LeaderBaseInfoThumbnail
          key={combo.leaderBaseStatistics.deckId}
          statistics={combo.leaderBaseStatistics}
          deckStatistics={combo.deckStatistics}
          statSectionVariant="horizontal"
        />
      ))}
      <div ref={observerTarget} className="h-4" />
    </div>
  );
};

export default StatisticsLeaderBaseLists;
