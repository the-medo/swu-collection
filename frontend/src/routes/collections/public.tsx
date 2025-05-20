import { createFileRoute } from '@tanstack/react-router';
import PublicCollections from '@/components/app/collections/PublicCollections/PublicCollections.tsx';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { CollectionType } from '../../../../types/enums.ts';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/collections/public')({
  component: PagePublicCollections,
});

function PagePublicCollections() {
  return (
    <>
      <Helmet title="Public Collections | SWUBase" />
      <div className="p-2">
        <div className="flex flex-row gap-4 items-center justify-between mb-2">
          <h3>Collections</h3>
          <NewCollectionDialog
            trigger={<Button>New collection</Button>}
            collectionType={CollectionType.COLLECTION}
          />
        </div>
        <PublicCollections collectionType={CollectionType.COLLECTION} />
      </div>
    </>
  );
}
