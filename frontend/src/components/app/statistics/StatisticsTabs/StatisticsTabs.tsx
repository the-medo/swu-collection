import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';

export interface StatisticsTabsProps {
  className?: string;
  activeTab?: string;
  basePath?: string;
  teamId?: string;
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
        sInTeam: prev.sInTeam,
      })}
      className={commonClass}
    >
      {tab.label}
    </Link>
  );
};

const baseTabs: TabConfig[] = [
  { key: 'dashboard', label: 'Dashboard', segment: 'dashboard' },
  { key: 'history', label: 'Match History', segment: 'history' },
  { key: 'decks', label: 'Decks', segment: 'decks' },
  { key: 'leader-and-base', label: 'Leader & Bases', segment: 'leader-and-base' },
  { key: 'matchups', label: 'Matchups', segment: 'matchups' },
];

const membersTab: TabConfig = { key: 'members', label: 'Members', segment: 'members' };

const StatisticsTabs: React.FC<StatisticsTabsProps> = ({
  className,
  activeTab,
  basePath = '/statistics',
  teamId,
}) => {
  const tabs = teamId ? [...baseTabs, membersTab] : baseTabs;
  const gridCols = teamId ? 'grid-cols-2 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-5';

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('grid mb-2 rounded-lg bg-muted p-1', gridCols)}>
        {tabs.map(tab => (
          <TabLink key={tab.key} tab={tab} isActive={activeTab === tab.key} basePath={basePath} />
        ))}
      </div>
    </div>
  );
};

export default StatisticsTabs;
