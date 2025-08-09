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
import { SwuAspect } from '../../../../../../../types/enums.ts';
import { useDeckData } from './../useDeckData';
import { aspectColors } from '../../../../../../../shared/lib/aspectColors.ts';
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

// Helper function to convert hex color to RGB values
const hexToRgb = (hexColor: string): { r: number; g: number; b: number } => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return { r, g, b };
};

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
  const { leaderCard, baseCard } = useDeckData(deckId);

  const isFavorite = !!deckData?.isFavorite;

  // Get the color aspects for gradient
  const leaderColorAspect = leaderCard?.aspects.find(
    a => a !== SwuAspect.VILLAINY && a !== SwuAspect.HEROISM,
  );
  const baseColorAspect = baseCard?.aspects[0];

  // Create gradient style based on leader and base aspects
  const gradientStyle = useMemo(() => {
    let style: CSSProperties = {};

    if (leaderColorAspect && aspectColors[leaderColorAspect]) {
      if (baseColorAspect && aspectColors[baseColorAspect]) {
        // Create gradient with both colors
        const leaderColor = aspectColors[leaderColorAspect];
        const baseColor = aspectColors[baseColorAspect];

        // Convert hex to rgba for both colors
        const { r: leaderR, g: leaderG, b: leaderB } = hexToRgb(leaderColor);
        const { r: baseR, g: baseG, b: baseB } = hexToRgb(baseColor);

        // Create a linear gradient
        style.background = `linear-gradient(to right, rgba(${leaderR}, ${leaderG}, ${leaderB}, 0.85), rgba(${baseR}, ${baseG}, ${baseB}, 0.85))`;
      } else {
        // Fallback to just leaderColorAspect if baseColorAspect is not available
        const color = aspectColors[leaderColorAspect];
        // Convert hex to rgba with 35% transparency
        const { r, g, b } = hexToRgb(color);
        style.background = `rgba(${r}, ${g}, ${b}, 0.85)`;
      }
    }

    return style;
  }, [leaderColorAspect, baseColorAspect]);

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
