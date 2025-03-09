import { createFileRoute } from '@tanstack/react-router';
import CardDetail from '@/components/app/cards/CardDetail/CardDetail.tsx';

export const Route = createFileRoute('/cards/detail/$cardId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { cardId } = Route.useParams();

  return <CardDetail cardId={cardId} />;
}
