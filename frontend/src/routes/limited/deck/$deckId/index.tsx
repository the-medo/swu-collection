import { createFileRoute } from '@tanstack/react-router';
import CPDeckDetail from '@/components/app/limited/CardPoolDeckDetail/CPDeckDetail.tsx';

export const Route = createFileRoute('/limited/deck/$deckId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { deckId } = Route.useParams();
  return <CPDeckDetail deckId={deckId} />;
}
