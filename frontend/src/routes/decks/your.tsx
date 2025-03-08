import { createFileRoute } from '@tanstack/react-router';
import { AuthorizedRouteComponent } from '../_authenticated';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import UserDecks from '@/components/app/decks/UserDecks/UserDecks.tsx';
import NewDeckDialog from '@/components/app/dialogs/NewDeckDialog/NewDeckDialog.tsx';

export const Route = createFileRoute('/decks/your')({
  component: YourDecks,
});

function YourDecks() {
  const user = useUser();

  return (
    <AuthorizedRouteComponent>
      <div className="p-2 w-100">
        <div className="flex flex-row gap-4 items-center justify-between mb-2">
          <h3>Your decks</h3>
          <NewDeckDialog trigger={<Button>New deck</Button>} />
        </div>
        <div className="flex gap-4 items-start min-w-[400px] w-full">
          <UserDecks userId={user?.id} loading={!user} />
        </div>
      </div>
    </AuthorizedRouteComponent>
  );
}
