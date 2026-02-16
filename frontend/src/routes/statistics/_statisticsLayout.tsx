import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import StatisticsTabs from '@/components/app/statistics/StatisticsTabs/StatisticsTabs.tsx';
import { useGetGameResults } from '@/api/game-results/useGetGameResults.ts';
import { useSession } from '@/lib/auth-client.ts';
import { format, subDays } from 'date-fns';
import StatisticsFilters from '@/components/app/statistics/components/StatisticsFilters/StatisticsFilters.tsx';
import { z } from 'zod';
import { StatisticsSubpage } from '@/components/app/statistics/components/StatisticsSubpageTabs/StatisticsSubpageTabs.tsx';
import { MatchupSort } from '@/components/app/statistics/components/SubpageMatchups/matchupLib.ts';
import { emptyCardStatTableRow } from '@/components/app/statistics/components/SubpageCardStats/cardStatLib.ts';
import { GameResultsProvider } from '@/components/app/statistics/GameResultsContext.tsx';

const statisticsSearchParams = z.object({
  sDeckId: z.string().optional(),
  sLeaderCardId: z.string().optional(),
  sBaseCardKey: z.string().optional(),

  sSubpage: z.enum(StatisticsSubpage).optional(),
  sMatchupSort: z.enum(MatchupSort).optional(),
  sCardMetricColumn: z.enum(Object.keys(emptyCardStatTableRow)).optional(),
  sCardMetricSort: z.enum(['asc', 'desc']).optional(),

  sMinMatches: z.coerce.number().optional(),
  sMinGames: z.coerce.number().optional(),

  sDateRangeOption: z.string().optional(),
  sDateRangeFrom: z.string().optional(),
  sDateRangeTo: z.string().optional(),
  sFormatId: z.coerce.number().optional(),
  sKarabastFormat: z.string().optional(),
});

export const Route = createFileRoute('/statistics/_statisticsLayout')({
  component: RouteComponent,
  validateSearch: statisticsSearchParams,
});

const datetimeFrom = format(subDays(new Date(), 90), 'yyyy-MM-dd');

function RouteComponent() {
  const { pathname } = useLocation();
  const activeTab = pathname.split('/').pop() || 'dashboard';
  const { sDateRangeFrom } = Route.useSearch();

  const session = useSession();

  useGetGameResults({
    datetimeFrom: sDateRangeFrom ?? datetimeFrom,
    enabled: !!session.data,
    userId: session.data?.user.id,
  });

  return (
    <div className="p-2 @container/full-stats-page">
      <div className="flex flex-row gap-4 items-center justify-between mb-2">
        <h3>Your statistics</h3>
        <div className="flex gap-4">
          <StatisticsFilters />
        </div>
      </div>
      <StatisticsTabs activeTab={activeTab} className="mb-4" />
      <GameResultsProvider>
        <Outlet />
      </GameResultsProvider>
    </div>
  );
}
