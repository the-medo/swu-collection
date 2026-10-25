import * as React from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import AllCardStats from '../AllCardStats/AllCardStats';
import AspectCardStats from '../AspectCardStats/AspectCardStats';
import LeaderCardStats from '../LeaderCardStats/LeaderCardStats';
import LeaderBaseCardStats from '../LeaderBaseCardStats/LeaderBaseCardStats';
import MatchupCardStats from '../MatchupCardStats/MatchupCardStats';
import { Button } from '@/components/ui/button.tsx';
import {
  workspaceStyles,
  workspaceTheme,
} from '@/components/app/global/WorkspacePage/workspaceStyles';
import { PortalThemeProvider } from '@/components/ui/portal-theme';

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

  if (tournamentGroupId === 'all') {
    return (
      <div className={cn(workspaceStyles.theme, 'w-full', className)}>
        <div className="flex flex-col items-center align-middle gap-2">
          <span>Card statistics are not available for this view.</span>
          <span>You can still display card statistics for full meta (PQs, SQs and RCs)</span>
          <Link to="/meta" search={prev => ({ ...prev, page: 'card-stats' })}>
            <Button size="sm">Display full meta card statistics</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PortalThemeProvider value={workspaceTheme}>
      <div className={cn(workspaceStyles.theme, 'w-full', className)}>
        <nav
          aria-label="Card statistics views"
          className={cn(workspaceStyles.tabs, 'mb-2 flex-wrap')}
        >
          {cardStatsTabsArray.map(tab => (
            <Link
              key={tab}
              to="."
              search={prev => {
                // Preserve leader/base parameters when switching between leader, leader-base and matchup tabs
                if (
                  (tab === 'leader' || tab === 'leader-base' || tab === 'matchup') &&
                  (csPage === 'leader' || csPage === 'leader-base' || csPage === 'matchup')
                ) {
                  return { ...prev, csPage: tab };
                }
                // Otherwise clear the parameters
                return {
                  ...prev,
                  csPage: tab,
                  csLeaderId: undefined,
                  csBaseId: undefined,
                  csLeaderId2: undefined,
                  csBaseId2: undefined,
                };
              }}
              aria-current={csPage === tab ? 'page' : undefined}
              className={cn(workspaceStyles.tab, 'flex-1')}
            >
              {tab === 'all' && 'All Cards'}
              {tab === 'aspect' && 'Aspect'}
              {tab === 'leader' && 'Leader'}
              {tab === 'leader-base' && 'Leader/Base'}
              {tab === 'matchup' && 'Matchup stats'}
            </Link>
          ))}
        </nav>

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
    </PortalThemeProvider>
  );
};

export default CardStatsTabs;
