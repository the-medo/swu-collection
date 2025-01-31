import { createFileRoute } from '@tanstack/react-router';
import { AuthorizedRouteComponent } from '../_authenticated';
import UserCollections from '@/components/app/collections/UserCollections/UserCollections.tsx';
import { useUser } from '@/hooks/useUser.ts';

export const Route = createFileRoute('/collections/your')({
  component: YourCollections,
});

function YourCollections() {
  const user = useUser();

  return (
    <AuthorizedRouteComponent>
      <div className="p-2 w-100">
        <h3>Your collections</h3>
        <div className="flex gap-4 items-start min-w-[400px] w-1/2">
          <UserCollections userId={user?.id} loading={!user} />
        </div>
      </div>
    </AuthorizedRouteComponent>
  );
}
