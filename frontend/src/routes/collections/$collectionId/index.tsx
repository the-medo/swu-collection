import { createFileRoute } from '@tanstack/react-router';
import CollectionDetail from '@/components/app/collections/CollectionDetail/CollectionDetail.tsx';

export const Route = createFileRoute('/collections/$collectionId/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <CollectionDetail />;
}
