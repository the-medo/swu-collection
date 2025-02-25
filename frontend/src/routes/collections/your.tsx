import { createFileRoute } from '@tanstack/react-router';
import { AuthorizedRouteComponent } from '../_authenticated';
import UserCollections from '@/components/app/collections/UserCollections/UserCollections.tsx';
import { useUser } from '@/hooks/useUser.ts';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import { Button } from '@/components/ui/button.tsx';

export const Route = createFileRoute('/collections/your')({
  component: YourCollections,
});

function YourCollections() {
  const user = useUser();

  return (
    <AuthorizedRouteComponent>
      <div className="p-2 w-100">
        <div className="flex flex-row gap-4 items-center justify-between mb-2">
          <h3>Your collections</h3>
          <NewCollectionDialog trigger={<Button>New collection</Button>} wantlist={false} />
        </div>
        <div className="flex gap-4 items-start min-w-[400px] w-full">
          <UserCollections userId={user?.id} loading={!user} wantlist={false} />
        </div>
      </div>
    </AuthorizedRouteComponent>
  );
}
