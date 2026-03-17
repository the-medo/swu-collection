import { createFileRoute } from '@tanstack/react-router';
import StatisticsMeta from '@/components/app/statistics/StatisticsMeta/StatisticsMeta.tsx';

export const Route = createFileRoute('/statistics/_statisticsLayout/meta/')({
  component: StatisticsMetaPage,
  head: () => ({
    meta: [
      {
        title: 'Meta | SWUBase',
      },
    ],
  }),
});

function StatisticsMetaPage() {
  return <StatisticsMeta />;
}
