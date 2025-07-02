import * as React from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Route } from '@/routes/meta';
import {
  AllDecksTab,
  MatchupsTab,
  MetaAnalysisTab,
  CardStatsTab,
} from '@/components/app/tournaments/TournamentTabs';
import { TournamentData } from '../../../../../../types/Tournament.ts';
import { useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import {
  TournamentTableColumnsProps,
  useTournamentTableColumns,
} from '@/components/app/tournaments/TournamentList/useTournamentTableColumns.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Helmet } from 'react-helmet-async';
import TournamentsDataLoader from '@/components/app/tournaments/TournamentMeta/TournamentsDataLoader.tsx';
import { CircleAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';

const tableColumnProps: TournamentTableColumnsProps = {};

interface MetaTabsProps {
  className?: string;
  metaId: number;
  tournaments: TournamentData[];
  tournamentGroupId?: string;
}

const MetaTabs: React.FC<MetaTabsProps> = ({
  className,
  metaId,
  tournaments,
  tournamentGroupId,
}) => {
  const { page } = useSearch({ from: Route.fullPath });
  const columns = useTournamentTableColumns(tableColumnProps);
  const tournamentIds = useMemo(() => tournaments.map(t => t.tournament.id), [tournaments]);

  const displayCardStatisticsWarning = tournamentGroupId === undefined;

  const cardStatLink = useMemo(
    () => (
      <Link
        to={Route.fullPath}
        search={prev => ({ ...prev, page: 'card-stats' })}
        className={cn(
          'flex gap-2 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
          page === 'card-stats'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Card Statistics
        {displayCardStatisticsWarning && <CircleAlert className="size-4" />}
      </Link>
    ),
    [page, displayCardStatisticsWarning],
  );

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-2 rounded-lg bg-muted p-1">
        <Link
          to={Route.fullPath}
          search={prev => ({ ...prev, page: 'tournaments' })}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            page === 'tournaments'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span>Tournaments</span>
          <Badge variant="secondary" className="ml-4">
            {tournamentIds.length}
          </Badge>
        </Link>
        <Link
          to={Route.fullPath}
          search={prev => ({ ...prev, page: 'meta' })}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            page === 'meta'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Meta Analysis
        </Link>
        <Link
          to={Route.fullPath}
          search={prev => ({ ...prev, page: 'matchups' })}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            page === 'matchups'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Matchups
        </Link>
        <Link
          to={Route.fullPath}
          search={prev => ({ ...prev, page: 'decks' })}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            page === 'decks'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          All Decks
        </Link>
        {displayCardStatisticsWarning ? (
          <Tooltip>
            <TooltipTrigger asChild>{cardStatLink}</TooltipTrigger>
            <TooltipContent className="max-w-[350px]">
              These statistics are for the whole meta (from all tournaments, ignoring selected
              "minimal tournament type" above)
            </TooltipContent>
          </Tooltip>
        ) : (
          cardStatLink
        )}
      </div>
      {page === 'tournaments' && (
        <>
          <Helmet title="Tournaments" />
          <h4>Analyzed tournaments</h4>
          <DataTable columns={columns} data={tournaments} />
        </>
      )}
      <TournamentsDataLoader tournaments={tournaments} />
      {page === 'meta' && <MetaAnalysisTab route={Route} />}
      {page === 'matchups' && <MatchupsTab route={Route} />}
      {page === 'decks' && <AllDecksTab />}
      {page === 'card-stats' && (
        <CardStatsTab
          tournamentId={metaId ? undefined : tournamentIds[0]}
          metaId={metaId}
          tournamentGroupId={tournamentGroupId}
          route={Route}
        />
      )}
    </div>
  );
};

export default MetaTabs;
