import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import StatisticsTabs from '@/components/app/stats/StatsTabs/StatisticsTabs.tsx';

export const Route = createFileRoute('/statistics/_statisticsLayout')({
  component: RouteComponent,
});

function RouteComponent() {
  const { pathname } = useLocation();
  const activeTab = pathname.split('/').pop() || 'dashboard';

  return (
    <div className="p-4">
      <StatisticsTabs activeTab={activeTab} className="mb-4" />
      <Outlet />
    </div>
  );
}
