import { Helmet } from 'react-helmet-async';
import { Earth, Plus, Star } from 'lucide-react';
import { AuthorizedRouteComponent } from '@/routes/_authenticated.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import NewDeckDialog from '@/components/app/dialogs/NewDeckDialog/NewDeckDialog.tsx';
import {
  BrowseHeader,
  BrowsePage,
  BrowseTabs,
} from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import { DeckIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';
import PublicDecks from './PublicDecks/PublicDecks.tsx';
import FavoriteDecks from './FavoriteDecks/FavoriteDecks.tsx';
import DeckFolders from './DeckFolders/DeckFolders.tsx';

const pages = {
  public: {
    title: 'Discover your next deck',
    description:
      'Explore community builds. Find your leader, choose your aspects, and make a deck your own.',
  },
  your: {
    title: 'Your decks',
    description:
      'From first ideas to tournament-ready lists. Keep your builds together and pick up where you left off.',
  },
  favorite: {
    title: 'Your favorite decks',
    description: 'The builds you want to come back to, all in one place.',
  },
};

export default function DeckBrowsePage({ scope }: { scope: keyof typeof pages }) {
  const user = useUser();
  const info = pages[scope];
  const page = (
    <BrowsePage>
      <BrowseHeader
        eyebrow={scope === 'public' ? 'The deck library' : 'Your deck library'}
        title={info.title}
        description={info.description}
        icon={DeckIcon}
      >
        <NewDeckDialog
          trigger={
            <Button>
              <Plus className="size-4" />
              New deck
            </Button>
          }
        />
      </BrowseHeader>
      <BrowseTabs
        label="Deck library navigation"
        items={[
          { title: 'Public decks', to: '/decks/public', active: scope === 'public', icon: Earth },
          { title: 'Your decks', to: '/decks/your', active: scope === 'your', icon: DeckIcon },
          { title: 'Favorites', to: '/decks/favorite', active: scope === 'favorite', icon: Star },
        ]}
      />
      {scope === 'public' ? (
        <PublicDecks />
      ) : scope === 'favorite' ? (
        <FavoriteDecks loading={!user} />
      ) : (
        user && <DeckFolders key={user.id} userId={user.id} />
      )}
    </BrowsePage>
  );
  return (
    <>
      <Helmet title={`${scope === 'public' ? 'Public decks' : info.title} | SWUBase`} />
      {scope === 'public' ? (
        page
      ) : (
        <AuthorizedRouteComponent title={info.title}>{page}</AuthorizedRouteComponent>
      )}
    </>
  );
}
