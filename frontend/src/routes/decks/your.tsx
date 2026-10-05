import { createFileRoute } from '@tanstack/react-router';
import { AuthorizedRouteComponent } from '../_authenticated';
import { useUser } from '@/hooks/useUser.ts';
import DeckFolders from '@/components/app/decks/DeckFolders/DeckFolders.tsx';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/decks/your')({
  component: YourDecks,
});

function YourDecks() {
  const user = useUser();

  return (
    <AuthorizedRouteComponent>
      <Helmet title="Your Decks | SWUBase" />
      {user && <DeckFolders key={user.id} userId={user.id} />}
    </AuthorizedRouteComponent>
  );
}
