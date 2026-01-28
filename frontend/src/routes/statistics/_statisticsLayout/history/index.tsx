import { createFileRoute } from '@tanstack/react-router';

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
  return (
    <>
      <div className="p-2"></div>
    </>
  );
}
