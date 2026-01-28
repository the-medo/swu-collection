import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/statistics/_statisticsLayout/decks/')({
  component: StatisticsDecksPage,
  head: () => ({
    meta: [
      {
        title: 'Decks | SWUBase',
      },
    ],
  }),
});

function StatisticsDecksPage() {
  return (
    <>
      <div className="p-2"></div>
    </>
  );
}
