import * as React from 'react';
import { StatSection } from '@/components/app/statistics/common/StatSection';
import { calculateResultStatistics } from '@/components/app/statistics/lib/resultStatistics';

interface DashboardOverviewProps {
  label: string;
  showWinLose?: boolean;
  showMatches?: boolean;
  stats: ReturnType<typeof calculateResultStatistics>;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  label,
  showWinLose = true,
  showMatches = true,
  stats,
}) => {
  return (
    <tr>
      <th scope="row">
        {label}
        {stats.containsInTeam && showWinLose && (
          <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
            In-team games excluded from W–L
          </span>
        )}
      </th>
      {showMatches && (
        <td>
          <StatSection
            total={stats.totalMatches}
            wins={stats.matchWins}
            losses={stats.matchLosses}
            draws={stats.matchDraws}
            winrate={stats.matchWinrate}
            showWinLose={showWinLose}
          />
        </td>
      )}
      <td>
        <StatSection
          total={stats.totalGames}
          wins={stats.gameWins}
          losses={stats.gameLosses}
          draws={stats.gameDraws}
          winrate={stats.gameWinrate}
          showWinLose={showWinLose}
        />
      </td>
    </tr>
  );
};

export default DashboardOverview;
