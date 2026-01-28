import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';

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
  return (
    <>
      <Helmet title="asd" />
    </>
  );
}
