import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import StatisticsTabs from '@/components/app/statistics/StatisticsTabs/StatisticsTabs.tsx';
import { useGetGameResults } from '@/api/game-results/useGetGameResults.ts';
import { useSession } from '@/lib/auth-client.ts';
import { format, subDays } from 'date-fns';

export const Route = createFileRoute('/statistics/_statisticsLayout')({
  component: RouteComponent,
});

const datetimeFrom = format(subDays(new Date(), 90), 'yyyy-mm-dd');

function RouteComponent() {
  const { pathname } = useLocation();
  const activeTab = pathname.split('/').pop() || 'dashboard';

  const session = useSession();

  useGetGameResults({
    datetimeFrom,
    enabled: !!session.data,
    userId: session.data?.user.id,
  });

  return (
    <div className="p-4 @container/full-stats-page">
      <StatisticsTabs activeTab={activeTab} className="mb-4" />
      <Outlet />
    </div>
  );
}
