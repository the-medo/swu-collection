import { createFileRoute } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser.ts';
import { AuthorizedRouteComponent } from '@/routes/_authenticated.tsx';
import NewCollectionDialog from '@/components/app/dialogs/NewCollectionDialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import UserCollections from '@/components/app/collections/UserCollections/UserCollections.tsx';

export const Route = createFileRoute('/wantlists/your')({
  component: YourWantlists,
});

function YourWantlists() {
  const user = useUser();

  return (
    <AuthorizedRouteComponent>
      <div className="p-2 w-100">
        <div className="flex flex-row gap-4 items-center justify-between mb-2">
          <h3>Your wantlists</h3>
          <NewCollectionDialog trigger={<Button>New wantlist</Button>} wantlist={true} />
        </div>
        <div className="flex gap-4 items-start min-w-[400px] w-full">
          <UserCollections userId={user?.id} loading={!user} wantlist={true} />
        </div>
      </div>
    </AuthorizedRouteComponent>
  );
}
