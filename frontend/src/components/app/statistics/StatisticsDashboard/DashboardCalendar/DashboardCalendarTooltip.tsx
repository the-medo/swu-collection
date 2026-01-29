import * as React from 'react';
import { DashboardCalendarData } from './DashboardCalendar.tsx';

interface DashboardCalendarTooltipProps {
  data: DashboardCalendarData;
}

const DashboardCalendarTooltip: React.FC<DashboardCalendarTooltipProps> = ({ data }) => {
  if (!data || !data.day) return null;

  const matchWinrate =
    data.matchesCount > 0 ? Math.round((data.matchWins / data.matchesCount) * 100) : 0;

  const gameWinrate = data.gamesCount > 0 ? Math.round((data.gameWins / data.gamesCount) * 100) : 0;

  const getWinrateColor = (winrate: number) => {
    if (winrate > 50) return 'text-green-600';
    if (winrate < 50) return 'text-red-600';
    return 'text-amber-500';
  };

  return (
    <div className="w-[240px] p-[10px] rounded-md flex flex-col gap-2 z-50 bg-white text-[#333] shadow-md border border-black/10">
      <div className="font-bold text-[12px] border-b border-[#eee] pb-1">{data.day}</div>

      <div className="flex flex-row items-center justify-between w-full gap-3">
        <div className="text-[11px] flex-1">
          Matches: <span className="font-bold text-[16px]">{data.matchesCount}</span>
        </div>
        <div className="py-[2px] px-[6px] rounded bg-black/5 font-bold min-w-[45px] text-center text-[11px] border border-black/10">
          {data.matchWins}-{data.matchLosses}
          {data.matchDraws > 0 ? `-${data.matchDraws}` : ''}
        </div>
        <div
          className={`text-[11px] ${getWinrateColor(matchWinrate)} font-bold min-w-[35px] text-right`}
        >
          {matchWinrate}%
        </div>
      </div>

      <div className="flex flex-row items-center justify-between w-full gap-3">
        <div className="text-[11px] flex-1">
          Games: <span className="font-bold text-[16px]">{data.gamesCount}</span>
        </div>
        <div className="py-[2px] px-[6px] rounded bg-black/5 font-bold min-w-[45px] text-center text-[11px] border border-black/10">
          {data.gameWins}-{data.gameLosses}
        </div>
        <div
          className={`text-[11px] ${getWinrateColor(gameWinrate)} font-bold min-w-[35px] text-right`}
        >
          {gameWinrate}%
        </div>
      </div>
    </div>
  );
};

export default DashboardCalendarTooltip;
