import * as React from 'react';
import { useMemo, CSSProperties } from 'react';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from '@/components/ui/navigation-menu.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useRole } from '@/hooks/useRole.ts';
import { useDeckColors } from '@/hooks/useDeckColors';
import { ComparerEntryAdditionalData } from '@/components/app/comparer/useComparerStore.ts';

// Import extracted components
import FavoriteButton from './components/FavoriteButton';
import CopyLinkButton from './components/CopyLinkButton';
import ComparerButton from './components/ComparerButton';
import DuplicateButton from './components/DuplicateButton';
import ExportOptionsMenu from './components/ExportOptionsMenu';
import AdminEditButton from './components/AdminEditButton';
import DecklistChartsTabs from './components/DecklistChartsTabs';
import DeckLayoutMenu from './components/DeckLayoutMenu';
import GroupByMenu from './components/GroupByMenu';
import DeckImageButton from '@/components/app/decks/DeckContents/DeckImage/DeckImageButton.tsx';

interface DeckActionsMenuProps {
  deckId: string;
  tabsValue?: string;
  onTabsValueChange?: (value: string) => void;
}

const DeckActionsMenu: React.FC<DeckActionsMenuProps> = ({
  deckId,
  tabsValue = 'decklist',
  onTabsValueChange,
}) => {
  const hasRole = useRole();
  const isAdmin = hasRole('admin');

  const { data: deckData } = useGetDeck(deckId);
  const { data: deckCardsData } = useGetDeckCards(deckId);
  const { data: cardListData } = useCardList();
  const { cssBackground } = useDeckColors(deckId, 'rgb');

  const isFavorite = !!deckData?.isFavorite;

  // Create gradient style based on cssBackground
  const gradientStyle = useMemo(() => {
    const style: CSSProperties = {};
    if (cssBackground) {
      style.background = cssBackground;
    }
    return style;
  }, [cssBackground]);

  const additionalData: ComparerEntryAdditionalData = useMemo(
    () => ({
      title: deckData?.deck.name,
    }),
    [deckData?.deck],
  );

  return (
    <NavigationMenu
      className="rounded-md border-border p-1 w-full mb-2 flex-wrap gap-1 justify-end"
      style={gradientStyle}
    >
      <NavigationMenuList className="flex-wrap justify-start gap-1">
        <FavoriteButton deckId={deckId} isFavorite={isFavorite} />
        <CopyLinkButton deckId={deckId} isPublic={!!deckData?.deck.public} />
        <ComparerButton deckId={deckId} additionalData={additionalData} />
        <DuplicateButton deckId={deckId} />
        <NavigationMenuItem>
          <DeckImageButton deckId={deckId} />
        </NavigationMenuItem>
        <ExportOptionsMenu
          deckData={deckData}
          deckCardsData={deckCardsData}
          cardListData={cardListData}
        />
        <AdminEditButton deckId={deckId} isAdmin={isAdmin} />
      </NavigationMenuList>
      <NavigationMenuList className="flex-wrap justify-start gap-1">
        <DecklistChartsTabs value={tabsValue} onValueChange={onTabsValueChange} />
        <DeckLayoutMenu />
        <GroupByMenu />
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default DeckActionsMenu;
