import * as React from 'react';
import { getWRColor } from './statsUtils';

interface StatSectionCompactProps {
  label: string;
  wins: number;
  losses: number;
  winrate: number;
}

export const StatSectionCompact: React.FC<StatSectionCompactProps> = ({
  label,
  wins,
  losses,
  winrate,
}) => {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="font-bold uppercase text-muted-foreground">{label}:</span>
      <span className="font-black whitespace-nowrap">
        {wins}W-{losses}L
      </span>
      <span className={`font-bold ${getWRColor(winrate)}`}>{winrate.toFixed(0)}%</span>
    </div>
  );
};
