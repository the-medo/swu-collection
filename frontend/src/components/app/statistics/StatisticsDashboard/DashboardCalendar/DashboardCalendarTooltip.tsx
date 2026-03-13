import * as React from 'react';
import { DashboardCalendarData } from './DashboardCalendar.tsx';
import { StatSection } from '@/components/app/statistics/common/StatSection';

interface DashboardCalendarTooltipProps {
  data: DashboardCalendarData;
  showWinLose?: boolean;
}

const DashboardCalendarTooltip: React.FC<DashboardCalendarTooltipProps> = ({
  data,
  showWinLose,
}) => {
  if (!data || !data.day) return null;

  const matchWinrate = data.matchesCount > 0 ? (data.matchWins / data.matchesCount) * 100 : 0;
  const gameWinrate = data.gamesCount > 0 ? (data.gameWins / data.gamesCount) * 100 : 0;

  return (
    <div className="p-4 rounded-md flex flex-col w-[280px] items-center gap-2 z-50 bg-background text-foreground shadow-md border border-border">
      <div className="font-bold text-sm border-b border-border pb-1 text-center">{data.day}</div>

      <div className="flex gap-4">
        <StatSection
          label="Games"
          total={data.gamesCount}
          wins={data.gameWins}
          losses={data.gameLosses}
          winrate={gameWinrate}
          showWinLose={showWinLose}
        />
        <StatSection
          label="Matches"
          total={data.matchesCount}
          wins={data.matchWins}
          losses={data.matchLosses}
          winrate={matchWinrate}
          showWinLose={showWinLose}
        />
      </div>
      {data.containsInTeam && showWinLose && (
        <div className="text-[10px]">In-team games are not included in W-L ratio.</div>
      )}
    </div>
  );
};

export default DashboardCalendarTooltip;
