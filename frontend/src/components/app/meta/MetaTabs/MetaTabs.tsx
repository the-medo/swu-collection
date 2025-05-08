import * as React from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Route } from '@/routes/meta';
import {
  AllDecksTab,
  MatchupsTab,
  MetaAnalysisTab,
} from '@/components/app/tournaments/TournamentTabs';
import { TournamentData } from '../../../../../../types/Tournament.ts';
import { useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table.tsx';
import {
  TournamentTableColumnsProps,
  useTournamentTableColumns,
} from '@/components/app/tournaments/TournamentList/useTournamentTableColumns.tsx';
import { Badge } from '@/components/ui/badge.tsx';

const tableColumnProps: TournamentTableColumnsProps = {};

interface MetaTabsProps {
  className?: string;
  tournaments: TournamentData[];
}

const MetaTabs: React.FC<MetaTabsProps> = ({ className, tournaments }) => {
  const { page } = useSearch({ from: Route.fullPath });
  const columns = useTournamentTableColumns(tableColumnProps);

  const tournamentIds = useMemo(() => tournaments.map(t => t.tournament.id), [tournaments]);

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-4 mb-2 rounded-lg bg-muted p-1">
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
      </div>
      {page === 'tournaments' && (
        <>
          <h4>Analyzed tournaments</h4>
          <DataTable columns={columns} data={tournaments} />
        </>
      )}
      {page === 'meta' && <MetaAnalysisTab tournamentIds={tournamentIds} route={Route} />}
      {page === 'matchups' && <MatchupsTab tournamentIds={tournamentIds} route={Route} />}
      {page === 'decks' && <AllDecksTab tournamentIds={tournamentIds} />}
    </div>
  );
};

export default MetaTabs;
