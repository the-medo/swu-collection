import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import * as React from 'react';
import { getWRColor } from './statsUtils';

interface StatSectionCompactProps {
  label: string;
  wins: number;
  losses: number;
  draws?: number;
  winrate: number;
}

export const StatSectionCompact: React.FC<StatSectionCompactProps> = ({
  label,
  wins,
  losses,
  draws = 0,
  winrate,
}) => {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="min-w-[8ch] font-bold uppercase text-muted-foreground">{label}:</span>
      <span className="inline-flex items-baseline font-black whitespace-nowrap tabular-nums">
        <span className={statisticsStyles.recordNumber}>{wins}</span>
        <span className="inline-block w-[1em]">W</span>
        <span aria-hidden="true">-</span>
        <span className={statisticsStyles.recordNumber}>{losses}</span>
        <span className="inline-block w-[1em]">L</span>
        {draws > 0 && (
          <>
            <span aria-hidden="true">-</span>
            <span className={statisticsStyles.recordNumber}>{draws}</span>
            <span className="inline-block w-[1em]">D</span>
          </>
        )}
      </span>
      <span className={`font-bold ${getWRColor(winrate)}`}>{winrate.toFixed(0)}%</span>
    </div>
  );
};
