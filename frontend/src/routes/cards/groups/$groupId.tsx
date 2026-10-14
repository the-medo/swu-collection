import { createFileRoute } from '@tanstack/react-router';
import CardGroupGallery from '@/components/app/cards/CardHome/CardGroupGallery.tsx';

export const Route = createFileRoute('/cards/groups/$groupId')({ component: CardGroupRoute });
function CardGroupRoute() {
  const { groupId } = Route.useParams();
  return <CardGroupGallery groupId={groupId} />;
}
