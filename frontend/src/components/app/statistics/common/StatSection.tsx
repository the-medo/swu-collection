import * as React from 'react';
import { getWRColor } from './statsUtils';

interface StatSectionProps {
  label: string;
  wins: number;
  losses: number;
  winrate: number;
}

export const StatSection: React.FC<StatSectionProps> = ({ label, wins, losses, winrate }) => (
  <div className="flex flex-col items-center">
    <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{label}</span>
    <div className="bg-muted/50 rounded-lg p-2 flex flex-col items-center min-w-[80px]">
      <h4 className="text-lg font-black leading-none mb-0!">
        {wins}W-{losses}L
      </h4>
      <span className={`text-xs font-bold mt-1 ${getWRColor(winrate)}`}>
        {winrate.toFixed(1)}% WR
      </span>
    </div>
  </div>
);
