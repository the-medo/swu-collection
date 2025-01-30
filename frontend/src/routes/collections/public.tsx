import PublicCollections from '@/components/app/collections/PublicCollections/PublicCollections';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/collections/public')({
  component: PagePublicCollections,
});

function PagePublicCollections() {
  return (
    <div className="p-2">
      <h3>Welcome in public collections!</h3>
      <PublicCollections />
    </div>
  );
}
