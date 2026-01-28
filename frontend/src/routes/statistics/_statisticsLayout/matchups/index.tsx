import { createFileRoute } from '@tanstack/react-router';

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
  return (
    <>
      <div className="p-2"></div>
    </>
  );
}
