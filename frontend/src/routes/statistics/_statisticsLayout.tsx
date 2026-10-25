import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles';
import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import { cn } from '@/lib/utils';
import { ChartNoAxesCombined } from 'lucide-react';
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import StatisticsTabs from '@/components/app/statistics/StatisticsTabs/StatisticsTabs.tsx';
import StatisticsFilters from '@/components/app/statistics/components/StatisticsFilters/StatisticsFilters.tsx';
import { z } from 'zod';
import { StatisticsSubpage } from '@/components/app/statistics/components/StatisticsSubpageTabs/StatisticsSubpageTabs.tsx';
import { MatchupSort } from '@/components/app/statistics/components/SubpageMatchups/matchupLib.ts';
import { emptyCardStatTableRow } from '@/components/app/statistics/components/SubpageCardStats/cardStatLib.ts';
import { GameResultsProvider } from '@/components/app/statistics/GameResultsContext.tsx';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import { MatchType } from '@/components/app/statistics/components/StatisticsFilters/MatchTypeSelector.tsx';
import { matchResultStatsTableSortColumns } from '@/components/app/statistics/common/MatchResultStatsTable/matchResultStatsTableLib.ts';
import { metaInfoArray } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';

const statisticsSearchParams = z.object({
  sDeckId: z.string().optional(),
  sLeaderCardId: z.string().optional(),
  sBaseCardKey: z.string().optional(),

  sSubpage: z.enum(StatisticsSubpage).optional(),
  sMatchupSort: z.enum(MatchupSort).optional(),
  sCardMetricColumn: z.enum(Object.keys(emptyCardStatTableRow)).optional(),
  sCardMetricSort: z.enum(['asc', 'desc']).optional(),
  sMatchResultStatsColumn: z.enum(matchResultStatsTableSortColumns).optional(),
  sMatchResultStatsSort: z.enum(['asc', 'desc']).optional(),
  sMetaInfo: z.enum([...metaInfoArray]).optional(),
  sMetaViewMode: z.enum(['chart', 'table']).optional(),

  sMinMatches: z.coerce.number().optional(),
  sMinGames: z.coerce.number().optional(),

  sDateRangeOption: z.string().optional(),
  sDateRangeFrom: z.string().optional(),
  sDateRangeTo: z.string().optional(),
  sFormatId: z.coerce.number().optional(),
  sKarabastFormat: z.string().optional(),
  sMatchType: z.enum(MatchType).optional(),
});

export const Route = createFileRoute('/statistics/_statisticsLayout')({
  component: RouteComponent,
  validateSearch: statisticsSearchParams,
});

function RouteComponent() {
  const { pathname } = useLocation();
  const activeTab = pathname.split('/').pop() || 'dashboard';
  return (
    <div
      className={cn(
        'p-2 sm:p-3 @container/full-stats-page',
        workspaceStyles.theme,
        statisticsStyles.page,
      )}
    >
      <SignInWrapper text="Sign in to see your statistics">
        <div className={statisticsStyles.header}>
          <h1 className={cn('flex items-center gap-2', workspaceStyles.title)}>
            <ChartNoAxesCombined
              size={20}
              className="text-[var(--workspace-accent)]"
              aria-hidden="true"
            />
            Your statistics
          </h1>
          <div className="min-w-0">
            <StatisticsFilters />
          </div>
        </div>
        <StatisticsTabs activeTab={activeTab} className={statisticsStyles.nav} />
        <GameResultsProvider>
          <Outlet />
        </GameResultsProvider>
      </SignInWrapper>
    </div>
  );
}
