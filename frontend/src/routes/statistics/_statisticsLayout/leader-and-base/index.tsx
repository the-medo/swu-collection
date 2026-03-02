import { createFileRoute } from '@tanstack/react-router';
import StatisticsLeaderBases from '@/components/app/statistics/StatisticsLeaderBases/StatisticsLeaderBases';

export const Route = createFileRoute('/statistics/_statisticsLayout/leader-and-base/')({
  component: StatisticsLeaderBasesPage,
  head: () => ({
    meta: [
      {
        title: 'Leader & Bases | SWUBase',
      },
    ],
  }),
});

function StatisticsLeaderBasesPage() {
  return <StatisticsLeaderBases />;
}
