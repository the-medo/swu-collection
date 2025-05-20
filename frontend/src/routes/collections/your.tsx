import { createFileRoute } from '@tanstack/react-router';
import { AuthorizedRouteComponent } from '../_authenticated';
import UserCollections from '@/components/app/collections/UserCollections/UserCollections.tsx';
import { useUser } from '@/hooks/useUser.ts';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { CollectionType } from '../../../../types/enums.ts';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/collections/your')({
  component: YourCollections,
});

function YourCollections() {
  const user = useUser();

  return (
    <AuthorizedRouteComponent>
      <>
        <Helmet title="Your Collections | SWUBase" />
        <div className="p-2 w-full">
          <div className="flex flex-row gap-4 items-center justify-between mb-2">
            <h3>Your collections</h3>
            <NewCollectionDialog
              trigger={<Button>New collection</Button>}
              collectionType={CollectionType.COLLECTION}
            />
          </div>
          <div className="flex gap-4 items-start w-full">
            <UserCollections
              userId={user?.id}
              loading={!user}
              collectionType={CollectionType.COLLECTION}
            />
          </div>
        </div>
      </>
    </AuthorizedRouteComponent>
  );
}
