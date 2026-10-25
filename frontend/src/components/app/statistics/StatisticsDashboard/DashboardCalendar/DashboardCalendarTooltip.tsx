import { areGameAndMatchRecordsEqual } from '@/components/app/statistics/lib/resultStatistics';
import * as React from 'react';
import { DashboardCalendarData } from './DashboardCalendar.tsx';
import { StatSection } from '@/components/app/statistics/common/StatSection';
import { cn } from '@/lib/utils';

interface DashboardCalendarTooltipProps {
  data: DashboardCalendarData;
  showWinLose?: boolean;
}

const DashboardCalendarTooltip: React.FC<DashboardCalendarTooltipProps> = ({
  data,
  showWinLose,
}) => {
  if (!data || !data.day) return null;

  const showMatches = !areGameAndMatchRecordsEqual({
    ...data,
    totalGames: data.gamesCount,
    totalMatches: data.matchesCount,
  });
  const ratedMatches = data.matchWins + data.matchLosses + data.matchDraws;
  const ratedGames = data.gameWins + data.gameLosses + data.gameDraws;
  const matchWinrate = ratedMatches > 0 ? (data.matchWins / ratedMatches) * 100 : 0;
  const gameWinrate = ratedGames > 0 ? (data.gameWins / ratedGames) * 100 : 0;

  return (
    <div className="p-4 rounded-md flex flex-col w-[280px] items-center gap-2 z-50 bg-background text-foreground shadow-md border border-border">
      <div className="font-bold text-sm border-b border-border pb-1 text-center">{data.day}</div>

      <div className={cn('grid w-full gap-3', showMatches && 'grid-cols-2')}>
        <StatSection
          label="Games"
          total={data.gamesCount}
          wins={data.gameWins}
          losses={data.gameLosses}
          draws={data.gameDraws}
          winrate={gameWinrate}
          showWinLose={showWinLose !== false && ratedGames > 0}
        />
        {showMatches && (
          <StatSection
            label="Matches"
            total={data.matchesCount}
            wins={data.matchWins}
            losses={data.matchLosses}
            draws={data.matchDraws}
            winrate={matchWinrate}
            showWinLose={showWinLose !== false && ratedMatches > 0}
          />
        )}
      </div>
      {ratedMatches === 0 && showWinLose !== false && (
        <div className="text-[10px] text-muted-foreground">
          No match results included in win rate.
        </div>
      )}
      {data.containsInTeam && showWinLose && (
        <div className="text-[10px]">In-team games are not included in W-L ratio.</div>
      )}
    </div>
  );
};

export default DashboardCalendarTooltip;
