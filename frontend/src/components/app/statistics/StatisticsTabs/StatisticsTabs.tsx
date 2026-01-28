import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';
import { Route as RouteDashboard } from '@/routes/statistics/_statisticsLayout/dashboard';
import { Route as RouteHistory } from '@/routes/statistics/_statisticsLayout/history';
import { Route as RouteDecks } from '@/routes/statistics/_statisticsLayout/decks';
import { Route as RouteMatchups } from '@/routes/statistics/_statisticsLayout/matchups';

export interface StatisticsTabsProps {
  className?: string;
  activeTab?: string;
}

interface TabConfig {
  key: string;
  label: string;
  path: typeof RouteDashboard | typeof RouteHistory | typeof RouteDecks | typeof RouteMatchups;
}

interface TabLinkProps {
  tab: TabConfig;
  isActive: boolean;
}

const TabLink: React.FC<TabLinkProps> = ({ tab, isActive }) => {
  const commonClass = cn(
    'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
    isActive
      ? 'bg-background text-foreground shadow-xs'
      : 'text-muted-foreground hover:text-foreground',
  );

  return (
    <Link to={tab.path.fullPath} className={commonClass}>
      {tab.label}
    </Link>
  );
};

const tabs: TabConfig[] = [
  { key: 'dashboard', label: 'Dashboard', path: RouteDashboard },
  { key: 'history', label: 'Match History', path: RouteHistory },
  { key: 'decks', label: 'Decks', path: RouteDecks },
  { key: 'matchups', label: 'Matchups', path: RouteMatchups },
] as const;

const StatisticsTabs: React.FC<StatisticsTabsProps> = ({ className, activeTab }) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 md:grid-cols-4 mb-2 rounded-lg bg-muted p-1">
        {tabs.map(tab => (
          <TabLink key={tab.key} tab={tab} isActive={activeTab === tab.key} />
        ))}
      </div>
    </div>
  );
};

export default StatisticsTabs;
