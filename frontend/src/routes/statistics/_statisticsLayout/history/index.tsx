import { createFileRoute } from '@tanstack/react-router';
import StatisticsHistory from '@/components/app/statistics/StatisticsHistory/StatisticsHistory';

export const Route = createFileRoute('/statistics/_statisticsLayout/history/')({
  component: StatisticsHistoryPage,
  head: () => ({
    meta: [
      {
        title: 'Match history | SWUBase',
      },
    ],
  }),
});

function StatisticsHistoryPage() {
  return <StatisticsHistory />;
}
