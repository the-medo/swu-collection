import * as React from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';

export interface StatisticsSubpageTabsProps {
  className?: string;
  type: 'deck' | 'leader-base';
}

export enum StatisticsSubpage {
  matches = 'matches',
  cardStats = 'card-stats',
  matchups = 'matchups',
  decklist = 'decklist',
}

interface TabConfig {
  key: StatisticsSubpage;
  label: string;
}

const tabs: Record<StatisticsSubpageTabsProps['type'], TabConfig[]> = {
  deck: [
    { key: StatisticsSubpage.matches, label: 'Match History' },
    { key: StatisticsSubpage.cardStats, label: 'Card Statistics' },
    { key: StatisticsSubpage.matchups, label: 'Matchups' },
    { key: StatisticsSubpage.decklist, label: 'Decklist' },
  ],
  'leader-base': [
    { key: StatisticsSubpage.matches, label: 'Match History' },
    { key: StatisticsSubpage.cardStats, label: 'Card Statistics' },
    { key: StatisticsSubpage.matchups, label: 'Matchups' },
  ],
};
const StatisticsSubpageTabs: React.FC<StatisticsSubpageTabsProps> = ({ className, type }) => {
  const { sSubpage = 'matches' } = useSearch({ strict: false });

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-6 mb-2 rounded-lg bg-muted p-1">
        {tabs[type].map(tab => {
          const isActive = sSubpage === tab.key;
          return (
            <Link
              key={tab.key}
              to={'.'}
              search={prev => ({
                ...prev,
                sSubpage: tab.key,
              })}
              className={cn(
                'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default StatisticsSubpageTabs;
