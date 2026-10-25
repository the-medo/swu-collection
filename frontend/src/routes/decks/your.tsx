import { createFileRoute } from '@tanstack/react-router';
import DeckBrowsePage from '@/components/app/decks/DeckBrowsePage.tsx';

export const Route = createFileRoute('/decks/your')({
  component: () => <DeckBrowsePage scope="your" />,
});
