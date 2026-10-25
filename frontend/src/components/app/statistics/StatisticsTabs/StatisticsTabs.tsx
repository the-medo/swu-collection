import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
import {
  LayoutDashboard,
  History,
  Layers3,
  Swords,
  ChartPie,
  Users,
  GalleryHorizontalEnd,
  type LucideIcon,
} from 'lucide-react';
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
  icon: LucideIcon;
}

interface TabLinkProps {
  tab: TabConfig;
  isActive: boolean;
  basePath: string;
}

const TabLink: React.FC<TabLinkProps> = ({ tab, isActive, basePath }) => {
  const commonClass = workspaceStyles.tab;

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
        sMatchType: prev.sMatchType,
      })}
      aria-current={isActive ? 'page' : undefined}
      className={commonClass}
    >
      <tab.icon size={15} aria-hidden="true" />
      {tab.label}
    </Link>
  );
};

const baseTabs: TabConfig[] = [
  { key: 'dashboard', label: 'Dashboard', segment: 'dashboard', icon: LayoutDashboard },
  { key: 'history', label: 'Match History', segment: 'history', icon: History },
  { key: 'decks', label: 'Decks', segment: 'decks', icon: Layers3 },
  {
    key: 'leader-and-base',
    label: 'Leaders & bases',
    segment: 'leader-and-base',
    icon: GalleryHorizontalEnd,
  },
  { key: 'matchups', label: 'Matchups', segment: 'matchups', icon: Swords },
  { key: 'meta', label: 'Opponent Meta', segment: 'meta', icon: ChartPie },
];

const membersTab: TabConfig = { key: 'members', label: 'Members', segment: 'members', icon: Users };

const StatisticsTabs: React.FC<StatisticsTabsProps> = ({
  className,
  activeTab,
  basePath = '/statistics',
  teamId,
}) => {
  const tabs = teamId ? [...baseTabs, membersTab] : baseTabs;

  return (
    <nav
      aria-label="Statistics sections"
      className={cn('@container/statistics-tabs w-full min-w-0', className)}
    >
      <div className={workspaceStyles.tabs}>
        {tabs.map(tab => (
          <TabLink key={tab.key} tab={tab} isActive={activeTab === tab.key} basePath={basePath} />
        ))}
      </div>
    </nav>
  );
};

export default StatisticsTabs;
