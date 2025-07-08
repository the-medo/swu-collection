import * as React from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import AllCardStats from '../AllCardStats/AllCardStats';
import AspectCardStats from '../AspectCardStats/AspectCardStats';
import LeaderCardStats from '../LeaderCardStats/LeaderCardStats';
import LeaderBaseCardStats from '../LeaderBaseCardStats/LeaderBaseCardStats';
import MatchupCardStats from '../MatchupCardStats/MatchupCardStats';

export const cardStatsTabsArray: [string, ...string[]] = [
  'all',
  'aspect',
  'leader',
  'leader-base',
  'matchup',
] as const;

interface CardStatsTabsProps {
  className?: string;
  metaId?: number;
  tournamentId?: string;
  tournamentGroupId?: string;
}

const CardStatsTabs: React.FC<CardStatsTabsProps> = ({
  className,
  metaId,
  tournamentId,
  tournamentGroupId,
}) => {
  const { csPage = 'all' } = useSearch({ strict: false });

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-5 mb-2 rounded-lg bg-muted p-1">
        {cardStatsTabsArray.map(tab => (
          <Link
            key={tab}
            to="."
            search={prev => {
              // Preserve leader/base parameters when switching between leader, leader-base and matchup tabs
              if ((tab === 'leader' || tab === 'leader-base' || tab === 'matchup') && 
                  (csPage === 'leader' || csPage === 'leader-base' || csPage === 'matchup')) {
                return { ...prev, csPage: tab };
              }
              // Otherwise clear the parameters
              return { ...prev, csPage: tab, csLeaderId: undefined, csBaseId: undefined, csLeaderId2: undefined, csBaseId2: undefined };
            }}
            className={cn(
              'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              csPage === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'all' && 'All Cards'}
            {tab === 'aspect' && 'Aspect'}
            {tab === 'leader' && 'Leader'}
            {tab === 'leader-base' && 'Leader/Base'}
            {tab === 'matchup' && 'Matchup stats'}
          </Link>
        ))}
      </div>

      {/* Render the appropriate component based on the selected tab */}
      {csPage === 'all' && (
        <AllCardStats
          metaId={metaId}
          tournamentId={tournamentId}
          tournamentGroupId={tournamentGroupId}
        />
      )}
      {csPage === 'aspect' && (
        <AspectCardStats
          metaId={metaId}
          tournamentId={tournamentId}
          tournamentGroupId={tournamentGroupId}
        />
      )}
      {csPage === 'leader' && (
        <LeaderCardStats
          metaId={metaId}
          tournamentId={tournamentId}
          tournamentGroupId={tournamentGroupId}
        />
      )}
      {csPage === 'leader-base' && (
        <LeaderBaseCardStats
          metaId={metaId}
          tournamentId={tournamentId}
          tournamentGroupId={tournamentGroupId}
        />
      )}
      {csPage === 'matchup' && (
        <MatchupCardStats
          metaId={metaId}
          tournamentId={tournamentId}
          tournamentGroupId={tournamentGroupId}
        />
      )}
    </div>
  );
};

export default CardStatsTabs;
