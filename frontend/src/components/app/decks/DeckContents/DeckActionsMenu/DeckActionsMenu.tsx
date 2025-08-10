import * as React from 'react';
import { useMemo } from 'react';
import { NavigationMenuList } from '@/components/ui/navigation-menu.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useRole } from '@/hooks/useRole.ts';
import { ComparerEntryAdditionalData } from '@/components/app/comparer/useComparerStore.ts';
import DeckNavigationMenu from '@/components/app/decks/DeckContents/DeckNavigationMenu/DeckNavigationMenu.tsx';
import FavoriteButton from './components/FavoriteButton';
import CopyLinkButton from './components/CopyLinkButton';
import ComparerButton from './components/ComparerButton';
import DuplicateButton from './components/DuplicateButton';
import ExportOptionsMenu from './components/ExportOptionsMenu';
import AdminEditButton from './components/AdminEditButton';

interface DeckActionsMenuProps {
  deckId: string;
}

const DeckActionsMenu: React.FC<DeckActionsMenuProps> = ({ deckId }) => {
  const hasRole = useRole();
  const isAdmin = hasRole('admin');

  const { data: deckData } = useGetDeck(deckId);
  const { data: deckCardsData } = useGetDeckCards(deckId);
  const { data: cardListData } = useCardList();

  const isFavorite = !!deckData?.isFavorite;

  const additionalData: ComparerEntryAdditionalData = useMemo(
    () => ({
      title: deckData?.deck.name,
    }),
    [deckData?.deck],
  );

  return (
    <DeckNavigationMenu deckId={deckId} className="z-20">
      <NavigationMenuList className="flex-wrap justify-start gap-1 z-10">
        <FavoriteButton deckId={deckId} isFavorite={isFavorite} />
        <CopyLinkButton deckId={deckId} isPublic={!!deckData?.deck.public} />
        <ComparerButton deckId={deckId} additionalData={additionalData} />
        <DuplicateButton deckId={deckId} />
        <ExportOptionsMenu
          deckData={deckData}
          deckCardsData={deckCardsData}
          cardListData={cardListData}
        />
        <AdminEditButton deckId={deckId} isAdmin={isAdmin} />
      </NavigationMenuList>
    </DeckNavigationMenu>
  );
};

export default DeckActionsMenu;
