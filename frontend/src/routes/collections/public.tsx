import PublicCollections from '@/components/app/collections/PublicCollections/PublicCollections';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';

export const Route = createFileRoute('/collections/public')({
  component: PagePublicCollections,
});

function PagePublicCollections() {
  return (
    <div className="p-2">
      <div className="flex flex-row gap-4 items-center justify-between mb-2">
        <h3>Collections</h3>
        <NewCollectionDialog trigger={<Button>New collection</Button>} wantlist={false} />
      </div>
      <PublicCollections />
    </div>
  );
}
