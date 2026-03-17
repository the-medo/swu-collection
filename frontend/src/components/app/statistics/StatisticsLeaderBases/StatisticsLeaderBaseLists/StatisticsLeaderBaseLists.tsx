import * as React from 'react';
import { StatisticsHistoryData } from '@/components/app/statistics/useGameResults.ts';
import { useMemo, useState } from 'react';
import {
  calculateDeckStatistics,
  matchesDeckQuickFilter,
} from '@/components/app/statistics/lib/deckLib.ts';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import LeaderBaseInfoThumbnail, {
  LeaderBaseInfoThumbnailProps,
} from '@/components/app/statistics/StatisticsDashboard/DashboardLeaderBase/LeaderBaseInfoThumbnail.tsx';
import DebouncedInput from '@/components/app/global/DebouncedInput/DebouncedInput.tsx';

interface StatisticsLeaderBaseListsProps {
  teamId?: string;
  byLeaderBase: StatisticsHistoryData['matches']['byLeaderBase'];
  byDeckId: StatisticsHistoryData['matches']['byDeckId'];
}

const StatisticsLeaderBaseLists: React.FC<StatisticsLeaderBaseListsProps> = ({
  teamId,
  byLeaderBase,
  byDeckId,
}) => {
  const [quickFilter, setQuickFilter] = useState<string | undefined>(undefined);

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
  }, [byDeckId, byLeaderBase]);

  const filteredCombinations = useMemo(() => {
    return recentCombinations.filter(combo =>
      matchesDeckQuickFilter(
        {
          deckName: undefined,
          leaderCardId: combo.leaderBaseStatistics.leaderCardId,
          baseCardKey: combo.leaderBaseStatistics.baseCardKey,
        },
        quickFilter,
      ),
    );
  }, [quickFilter, recentCombinations]);

  const hasQuickFilter = !!quickFilter?.trim();

  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: filteredCombinations.length,
    initialItemsToLoad: 20,
    itemsPerBatch: 20,
    threshold: 400,
  });

  const visibleCombinations = useMemo(() => {
    return filteredCombinations.slice(0, itemsToShow);
  }, [filteredCombinations, itemsToShow]);

  if (recentCombinations.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium whitespace-nowrap">Quick filter:</span>
        <DebouncedInput
          type="text"
          value={quickFilter}
          onChange={setQuickFilter}
          width="full"
          placeholder="Leader or base"
        />
      </div>
      {visibleCombinations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {hasQuickFilter
            ? 'No leader/base combinations match this quick filter.'
            : 'No leader/base combinations to show.'}
        </p>
      ) : (
        <>
          {visibleCombinations.map(combo => (
            <LeaderBaseInfoThumbnail
              key={combo.leaderBaseStatistics.deckId}
              teamId={teamId}
              statistics={combo.leaderBaseStatistics}
              deckStatistics={combo.deckStatistics}
              statSectionVariant="horizontal"
            />
          ))}
          <div ref={observerTarget} className="h-4" />
        </>
      )}
    </div>
  );
};

export default StatisticsLeaderBaseLists;
