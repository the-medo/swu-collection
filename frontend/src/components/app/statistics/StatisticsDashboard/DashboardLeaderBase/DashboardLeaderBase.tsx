import * as React from 'react';
import { StatisticsHistoryData } from '@/components/app/statistics/useGameResults.ts';
import { useMemo } from 'react';
import { calculateDeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import LeaderBaseInfoThumbnail, {
  LeaderBaseInfoThumbnailProps,
} from './LeaderBaseInfoThumbnail.tsx';

interface DashboardLeaderBaseProps {
  byLeaderBase: StatisticsHistoryData['matches']['byLeaderBase'];
  byDeckId: StatisticsHistoryData['matches']['byDeckId'];
}

const RECENT_LEADER_BASE_COUNT = 4;

const DashboardLeaderBase: React.FC<DashboardLeaderBaseProps> = ({ byLeaderBase, byDeckId }) => {
  const recentCombinations = useMemo(() => {
    if (!byLeaderBase || !byLeaderBase.lastPlayed) return [];

    const comboKeys = Object.keys(byLeaderBase.lastPlayed);

    // Sort by last played date desc
    const sortedComboKeys = comboKeys.sort((a, b) => {
      const dateA = new Date(byLeaderBase.lastPlayed[a]).getTime();
      const dateB = new Date(byLeaderBase.lastPlayed[b]).getTime();
      return dateB - dateA;
    });

    const recentKeys = sortedComboKeys.slice(0, RECENT_LEADER_BASE_COUNT);

    return recentKeys.map(key => {
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

  if (recentCombinations.length === 0) return null;

  return recentCombinations.map(combo => (
    <LeaderBaseInfoThumbnail
      key={combo.leaderBaseStatistics.deckId}
      statistics={combo.leaderBaseStatistics}
      deckStatistics={combo.deckStatistics}
    />
  ));
};

export default DashboardLeaderBase;
