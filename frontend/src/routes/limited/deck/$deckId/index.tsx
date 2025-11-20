import { createFileRoute } from '@tanstack/react-router';
import DeckDetail from '@/components/app/limited/DeckDetail/DeckDetail.tsx';

export const Route = createFileRoute('/limited/deck/$deckId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { deckId } = Route.useParams();
  return <DeckDetail deckId={deckId} />;
}
