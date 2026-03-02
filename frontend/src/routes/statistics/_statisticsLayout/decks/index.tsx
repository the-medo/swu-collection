import { createFileRoute } from '@tanstack/react-router';
import StatisticsDecks from '@/components/app/statistics/StatisticsDecks/StatisticsDecks';

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
  return <StatisticsDecks />;
}
