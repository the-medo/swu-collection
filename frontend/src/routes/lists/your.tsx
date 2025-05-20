import { createFileRoute } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser.ts';
import { AuthorizedRouteComponent } from '@/routes/_authenticated.tsx';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import UserCollections from '@/components/app/collections/UserCollections/UserCollections.tsx';
import { CollectionType } from '../../../../types/enums.ts';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/lists/your')({
  component: YourCardLists,
});

function YourCardLists() {
  const user = useUser();

  return (
    <AuthorizedRouteComponent>
      <>
        <Helmet title="Your Card Lists | SWUBase" />
        <div className="p-2 w-full">
          <div className="flex flex-row gap-4 items-center justify-between mb-2">
            <h3>Your card lists</h3>
            <NewCollectionDialog
              trigger={<Button>New card list</Button>}
              collectionType={CollectionType.OTHER}
            />
          </div>
          <div className="flex gap-4 items-start w-full">
            <UserCollections
              userId={user?.id}
              loading={!user}
              collectionType={CollectionType.OTHER}
            />
          </div>
        </div>
      </>
    </AuthorizedRouteComponent>
  );
}
