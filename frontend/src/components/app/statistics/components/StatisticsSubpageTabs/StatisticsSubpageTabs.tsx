import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
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
      <div className={cn('mb-2 flex-wrap', workspaceStyles.tabs)}>
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
              aria-current={isActive ? 'page' : undefined}
              className={cn('flex-1', workspaceStyles.tab)}
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
