import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';

export interface StatisticsTabsProps {
  className?: string;
  activeTab?: string;
  basePath?: string;
}

interface TabConfig {
  key: string;
  label: string;
  segment: string;
}

interface TabLinkProps {
  tab: TabConfig;
  isActive: boolean;
  basePath: string;
}

const TabLink: React.FC<TabLinkProps> = ({ tab, isActive, basePath }) => {
  const commonClass = cn(
    'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
    isActive
      ? 'bg-background text-foreground shadow-xs'
      : 'text-muted-foreground hover:text-foreground',
  );

  return (
    <Link
      to={`${basePath}/${tab.segment}`}
      search={prev => ({
        sDateRangeOption: prev.sDateRangeOption,
        sDateRangeFrom: prev.sDateRangeFrom,
        sDateRangeTo: prev.sDateRangeTo,
        sFormatId: prev.sFormatId,
        sKarabastFormat: prev.sKarabastFormat,
      })}
      className={commonClass}
    >
      {tab.label}
    </Link>
  );
};

const tabs: TabConfig[] = [
  { key: 'dashboard', label: 'Dashboard', segment: 'dashboard' },
  { key: 'history', label: 'Match History', segment: 'history' },
  { key: 'decks', label: 'Decks', segment: 'decks' },
  { key: 'leader-and-base', label: 'Leader & Bases', segment: 'leader-and-base' },
  { key: 'matchups', label: 'Matchups', segment: 'matchups' },
];

const StatisticsTabs: React.FC<StatisticsTabsProps> = ({
  className,
  activeTab,
  basePath = '/statistics',
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 md:grid-cols-5 mb-2 rounded-lg bg-muted p-1">
        {tabs.map(tab => (
          <TabLink key={tab.key} tab={tab} isActive={activeTab === tab.key} basePath={basePath} />
        ))}
      </div>
    </div>
  );
};

export default StatisticsTabs;
