import * as React from 'react';
import { NavigationMenuItem, NavigationMenuList } from '@/components/ui/navigation-menu.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import DeckNavigationMenu from '@/components/app/decks/DeckContents/DeckNavigationMenu/DeckNavigationMenu.tsx';
import FavoriteButton from './components/FavoriteButton';
import CopyLinkButton from './components/CopyLinkButton';
import PriceSourceSelector from './components/PriceSourceSelector';
import DeckMenu from './components/DeckMenu/DeckMenu.tsx';
import DecklistViewModeSelector from '@/components/app/decks/DeckContents/DeckActionsMenu/components/DecklistViewModeSelector.tsx';
import DeckImageButton from '@/components/app/decks/DeckContents/DeckImage/DeckImageButton.tsx';

interface DeckActionsMenuCompactProps {
  deckId: string;
  tabs: string;
  setTabsValue?: (value: string) => void;
}

const DeckActionsMenuCompact: React.FC<DeckActionsMenuCompactProps> = ({
  deckId,
  tabs,
  setTabsValue,
}) => {
  const { data: deckData } = useGetDeck(deckId);

  const isFavorite = !!deckData?.isFavorite;

  return (
    <DeckNavigationMenu deckId={deckId} className="z-20 justify-between">
      <NavigationMenuList className="flex-wrap justify-start gap-1 z-10">
        <DecklistViewModeSelector value={tabs} onValueChange={setTabsValue} />
        <NavigationMenuItem>
          <div className="w-full flex justify-center bg-background rounded-md">
            <DeckImageButton deckId={deckId} />
          </div>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuList className="flex-wrap justify-start gap-1 z-10">
        <FavoriteButton deckId={deckId} isFavorite={isFavorite} />
        <CopyLinkButton
          deckId={deckId}
          isPublic={!!deckData?.deck.public}
          compact={true}
          inNavigation={true}
        />
        <PriceSourceSelector showPricesOption={true} compact={true} />
        <DeckMenu deckId={deckId} />
      </NavigationMenuList>
    </DeckNavigationMenu>
  );
};

export default DeckActionsMenuCompact;
