import { createFileRoute } from '@tanstack/react-router';
import PublicCollections from '@/components/app/collections/PublicCollections/PublicCollections.tsx';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import CountryAndStateSelectors from '@/components/app/collections/PublicCollections/CountryAndStateSelectors.tsx';

export const Route = createFileRoute('/collections/public')({
  component: PagePublicCollections,
});

function PagePublicCollections() {
  return (
    <div className="p-2">
      <div className="flex flex-row gap-4 items-center justify-between mb-2">
        <h3>Collections</h3>
        <CountryAndStateSelectors />
        <NewCollectionDialog trigger={<Button>New collection</Button>} wantlist={false} />
      </div>
      <PublicCollections />
    </div>
  );
}
