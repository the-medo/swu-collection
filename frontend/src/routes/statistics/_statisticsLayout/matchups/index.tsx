import { createFileRoute } from '@tanstack/react-router';
import StatisticsMatchups from '@/components/app/statistics/StatisticsMatchups/StatisticsMatchups';

export const Route = createFileRoute('/statistics/_statisticsLayout/matchups/')({
  component: StatisticsMatchupsPage,
  head: () => ({
    meta: [
      {
        title: 'Matchups | SWUBase',
      },
    ],
  }),
});

function StatisticsMatchupsPage() {
  return <StatisticsMatchups />;
}
