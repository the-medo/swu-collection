import { createFileRoute } from '@tanstack/react-router';
import { AuthorizedRouteComponent } from '../_authenticated';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import FavoriteDecks from '@/components/app/decks/FavoriteDecks/FavoriteDecks.tsx';
import NewDeckDialog from '@/components/app/dialogs/NewDeckDialog/NewDeckDialog.tsx';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/decks/favorite')({
  component: FavDecks,
});

function FavDecks() {
  const user = useUser();

  return (
    <>
      <Helmet title="Favorite Decks | SWUBase" />
      <AuthorizedRouteComponent title="Your favorite decks">
        <div className="p-2 w-100">
          <div className="flex flex-row gap-4 items-center justify-between mb-2">
            <h3>Your favorite decks</h3>
            <NewDeckDialog trigger={<Button>New deck</Button>} />
          </div>
          <div className="flex flex-col gap-2 items-start min-w-[300px] w-full">
            <FavoriteDecks loading={!user} />
          </div>
        </div>
      </AuthorizedRouteComponent>
    </>
  );
}
