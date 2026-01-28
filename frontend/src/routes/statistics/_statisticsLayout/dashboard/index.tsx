import { createFileRoute } from '@tanstack/react-router';
import StatisticsDashboard from '@/components/app/statistics/StatisticsDashboard/StatisticsDashboard';

export const Route = createFileRoute('/statistics/_statisticsLayout/dashboard/')({
  component: StatisticsDashboardPage,
  head: () => ({
    meta: [
      {
        title: 'Dashboard | SWUBase',
      },
    ],
  }),
});

function StatisticsDashboardPage() {
  return <StatisticsDashboard />;
}
