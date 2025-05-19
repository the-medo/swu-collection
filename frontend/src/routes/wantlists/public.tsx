import { createFileRoute } from '@tanstack/react-router';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import PublicCollections from '@/components/app/collections/PublicCollections/PublicCollections.tsx';
import { CollectionType } from '../../../../types/enums.ts';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/wantlists/public')({
  component: PagePublicWantlists,
});

function PagePublicWantlists() {
  return (
    <>
      <Helmet title="Public Wantlists | SWUBase" />
      <div className="p-2">
        <div className="flex flex-row gap-4 items-center justify-between mb-2">
          <h3>Wantlists</h3>
          <NewCollectionDialog
            trigger={<Button>New wantlist</Button>}
            collectionType={CollectionType.WANTLIST}
          />
        </div>
        <PublicCollections collectionType={CollectionType.WANTLIST} />
      </div>
    </>
  );
}
