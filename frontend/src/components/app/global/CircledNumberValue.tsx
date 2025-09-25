import React from 'react';
import { cn } from '@/lib/utils.ts';

interface CircledNumberValueProps {
  val?: number;
  background?: 'green' | 'none' | 'muted';
  strong?: boolean;
}

const CircledNumberValue: React.FC<CircledNumberValueProps> = ({
  val,
  background = 'none',
  strong = false,
}) => {
  const v = val ?? 0;

  return (
    <div
      className={cn(`h-7 w-7 rounded-full text-foreground flex items-center justify-center`, {
        'bg-emerald-200/70 dark:bg-emerald-300/30': background === 'green',
        'bg-muted': background === 'muted',
        'bg-none': background === 'none',
        'font-semibold': strong,
      })}
    >
      {v}
    </div>
  );
};

export default CircledNumberValue;
