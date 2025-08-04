import { createFileRoute } from '@tanstack/react-router';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';

export const Route = createFileRoute('/decks/$deckId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { deckId } = Route.useParams();

  return <DeckDetail deckId={deckId} />;
}
