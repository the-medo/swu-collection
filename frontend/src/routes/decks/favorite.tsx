import { createFileRoute } from '@tanstack/react-router';
import DeckBrowsePage from '@/components/app/decks/DeckBrowsePage.tsx';

export const Route = createFileRoute('/decks/favorite')({
  component: () => <DeckBrowsePage scope="favorite" />,
});
