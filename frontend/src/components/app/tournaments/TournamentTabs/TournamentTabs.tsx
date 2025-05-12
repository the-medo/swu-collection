import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface TournamentTabsProps {
  tournamentId: string;
  children?: React.ReactNode;
  className?: string;
  activeTab?: string;
}

const TournamentTabs: React.FC<TournamentTabsProps> = ({
  tournamentId,
  children,
  className,
  activeTab = 'details',
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-5 mb-2 rounded-lg bg-muted p-1">
        <Link
          to={`/tournaments/$tournamentId/details`}
          params={{ tournamentId }}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            activeTab === 'details'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Details & Bracket
        </Link>
        <Link
          to={`/tournaments/$tournamentId/meta`}
          params={{ tournamentId }}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            activeTab === 'meta'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Meta Analysis
        </Link>
        <Link
          to={`/tournaments/$tournamentId/matchups`}
          params={{ tournamentId }}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            activeTab === 'matchups'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Matchups
        </Link>
        <Link
          to={`/tournaments/$tournamentId/decks`}
          params={{ tournamentId }}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            activeTab === 'decks'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          All Decks
        </Link>
        <Link
          to={`/tournaments/$tournamentId/card-stats`}
          params={{ tournamentId }}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            activeTab === 'card-stats'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Card Statistics
        </Link>
      </div>
      {children}
    </div>
  );
};

export default TournamentTabs;
