import * as React from 'react';
import { getWRColor, getWRHexColor } from './statsUtils';

interface StatSectionProps {
  label: string;
  wins: number;
  losses: number;
  winrate: number;
}

export const StatSection: React.FC<StatSectionProps> = ({ label, wins, losses, winrate }) => {
  const color = getWRHexColor(winrate);
  const percentage = winrate;

  return (
    <div className="flex flex-col gap-2 items-center">
      <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{label}</span>
      <div className="bg-muted/50 rounded-lg p-1 flex flex-1 items-center w-full justify-center">
        <h5 className="mb-0!">{wins + losses}</h5>
      </div>
      <div
        className="rounded-lg p-[5px] flex items-center justify-center min-w-[90px]"
        style={{
          background: `conic-gradient(${color} 0deg ${percentage}%, ${color}44 ${percentage}% 360deg)`,
        }}
      >
        <div className="bg-background rounded-lg p-2 flex flex-col items-center min-w-[80px] w-full h-full">
          <h5 className="text-lg font-black leading-none mb-0!">
            {wins}W-{losses}L
          </h5>
          <span className={`text-sm font-bold mt-1 ${getWRColor(winrate)}`}>
            {winrate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
