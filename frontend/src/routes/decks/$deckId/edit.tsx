import { createFileRoute } from '@tanstack/react-router';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';

export const Route = createFileRoute('/decks/$deckId/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { deckId } = Route.useParams();

  return <DeckDetail adminEdit={true} deckId={deckId} />;
}
