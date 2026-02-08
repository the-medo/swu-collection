import * as React from 'react';
import { getWRColor, getWRHexColor } from './statsUtils';
import { cn } from '@/lib/utils.ts';

export interface StatSectionProps {
  label: string;
  wins?: number;
  losses?: number;
  winrate?: number;
  variant?: 'vertical' | 'horizontal';
}

export const StatSection: React.FC<StatSectionProps> = ({
  label,
  wins = 0,
  losses = 0,
  winrate = 0,
  variant = 'vertical',
}) => {
  const color = getWRHexColor(winrate);
  const percentage = winrate;

  return (
    <div
      className={cn('flex gap-2 items-center', variant === 'horizontal' ? 'flex-row' : 'flex-col')}
    >
      <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1 min-w-[50px]">
        {label}
      </span>
      <div
        className={cn('bg-muted/50 rounded-lg p-1 flex flex-1 items-center w-full justify-center', {
          'min-w-[40px] h-full': variant === 'horizontal',
        })}
      >
        <h5 className="mb-0!">{wins + losses}</h5>
      </div>
      <div
        className="rounded-lg p-[5px] flex items-center justify-center min-w-[90px]"
        style={{
          background: `conic-gradient(${color} 0deg ${percentage}%, ${color}44 ${percentage}% 360deg)`,
        }}
      >
        <div className="bg-background rounded-lg p-2 flex flex-col items-center min-w-[90px] w-full h-full">
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
