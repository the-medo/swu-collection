import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

type TournamentTabsMode = 'tournament-page' | 'search-params';

export interface TournamentTabsProps {
  tournamentId: string;
  children?: React.ReactNode;
  className?: string;
  activeTab?: string;
  mode?: TournamentTabsMode; // default: 'tournament-page'
}

interface TabConfig {
  key: string;
  label: string;
  path: string;
}

interface TabLinkProps {
  tournamentId: string;
  tab: TabConfig;
  isActive: boolean;
  mode: TournamentTabsMode;
}

const TabLink: React.FC<TabLinkProps> = ({ tournamentId, tab, isActive, mode }) => {
  const commonClass = cn(
    'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
    isActive
      ? 'bg-background text-foreground shadow-xs'
      : 'text-muted-foreground hover:text-foreground',
  );

  if (mode === 'tournament-page') {
    return (
      <Link
        to={`/tournaments/$tournamentId/${tab.path}`}
        params={{ tournamentId }}
        className={commonClass}
      >
        {tab.label}
      </Link>
    );
  }

  // mode === 'search-params'
  return (
    <Link to="." search={prev => ({ ...prev, page: tab.key })} className={commonClass}>
      {tab.label}
    </Link>
  );
};

const tabs: TabConfig[] = [
  { key: 'details', label: 'Details & Bracket', path: 'details' },
  { key: 'meta', label: 'Meta Analysis', path: 'meta' },
  { key: 'matchups', label: 'Matchups', path: 'matchups' },
  { key: 'decks', label: 'All Decks', path: 'decks' },
  { key: 'card-stats', label: 'Card Statistics', path: 'card-stats' },
] as const;

const TournamentTabs: React.FC<TournamentTabsProps> = ({
  tournamentId,
  children,
  className,
  activeTab = 'details',
  mode = 'tournament-page',
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-3 md:grid-cols-5 mb-2 rounded-lg bg-muted p-1">
        {tabs.map(tab => (
          <TabLink
            key={tab.key}
            tournamentId={tournamentId}
            tab={tab}
            isActive={activeTab === tab.key}
            mode={mode}
          />
        ))}
      </div>
      {children}
    </div>
  );
};

export default TournamentTabs;
