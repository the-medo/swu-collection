import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/collections/public')({
  component: PublicCollections,
});

function PublicCollections() {
  return (
    <div className="p-2">
      <h3>Welcome in public collections!</h3>
    </div>
  );
}
