import DeckLeaderBase from '@/components/app/decks/DeckContents/DeckLeaderBase.tsx';
import DeckCards from '@/components/app/decks/DeckContents/DeckCards/DeckCards.tsx';
import DeckInputCommand from '@/components/app/decks/DeckContents/DeckInputCommand/DeckInputCommand.tsx';
import { useDeckInfo } from './useDeckInfoStore.ts';
import { useState } from 'react';
import DeckActionsMenu from '@/components/app/decks/DeckContents/DeckActionsMenu/DeckActionsMenu.tsx';
import DeckBoardCardCounts from '@/components/app/decks/DeckContents/DeckBoardCardCounts/DeckBoardCardCounts.tsx';
import DeckMatches from '@/components/app/decks/DeckContents/DeckMatches/DeckMatches.tsx';
import DeckStats from '@/components/app/decks/DeckContents/DeckStats/DeckStats.tsx';
import DeckNavigationMenu from '@/components/app/decks/DeckContents/DeckNavigationMenu/DeckNavigationMenu.tsx';
import DeckLayoutMenu from '@/components/app/decks/DeckContents/DeckActionsMenu/components/DeckLayoutMenu.tsx';
import GroupByMenu from '@/components/app/decks/DeckContents/DeckActionsMenu/components/GroupByMenu.tsx';
import * as React from 'react';
import DecklistChartsTabs from '@/components/app/decks/DeckContents/DeckActionsMenu/components/DecklistChartsTabs.tsx';
import { NavigationMenuItem, NavigationMenuList } from '@/components/ui/navigation-menu.tsx';
import DeckImageButton from '@/components/app/decks/DeckContents/DeckImage/DeckImageButton.tsx';
import { Link } from '@tanstack/react-router';
import { Hammer } from 'lucide-react';
import DeckGradientButton from '@/components/app/decks/DeckContents/DeckImage/DeckGradientButton.tsx';

interface DeckContentsProps {
  deckId: string;
  setDeckId?: (id: string) => void;
  highlightedCardId?: string;
  deckbuilder?: boolean;
}

const DeckContents: React.FC<DeckContentsProps> = ({
  deckId,
  setDeckId,
  highlightedCardId,
  deckbuilder,
}) => {
  const { owned } = useDeckInfo(deckId);
  const [tabsValue, setTabsValue] = useState('decklist');

  return (
    <>
      {!deckbuilder && <DeckActionsMenu deckId={deckId} />}
      <div className="flex max-xl:flex-col justify-center flex-wrap sm:flex-nowrap gap-2 w-full">
        {!deckbuilder && (
          <div className="flex max-xl:flex-row max-xl:flex-wrap max-xl:justify-center max-xl:w-auto w-[350px] flex-col gap-2 items-center">
            <div className="flex flex-row gap-2 flex-wrap items-center justify-center">
              <DeckLeaderBase deckId={deckId} size="w300" />
            </div>
            {owned && (
              <Link to="/decks/$deckId/edit" params={{ deckId }} search={{ deckbuilder: true }}>
                <DeckGradientButton deckId={deckId} variant="outline" size="lg">
                  <Hammer className="mr-4" />
                  <h4 className="mb-0">Deckbuilder</h4>
                </DeckGradientButton>
              </Link>
            )}
            <DeckMatches deckId={deckId} setDeckId={setDeckId} />
          </div>
        )}
        <div className="w-full">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-wrap justify-between gap-4 max-lg:justify-center max-lg:border-t max-lg:pt-2 border-b pb-2">
              <DeckNavigationMenu deckId={deckId} className="justify-between">
                <NavigationMenuList className="flex-wrap justify-start gap-1">
                  <DecklistChartsTabs
                    deckId={deckId}
                    value={tabsValue}
                    onValueChange={setTabsValue}
                  />
                  <NavigationMenuItem>
                    <div className="w-full flex justify-center bg-background rounded-md">
                      <DeckImageButton deckId={deckId} />
                    </div>
                  </NavigationMenuItem>
                </NavigationMenuList>
                <NavigationMenuList className="flex-wrap justify-start gap-1">
                  {owned ? (
                    <DeckInputCommand deckId={deckId} />
                  ) : (
                    <NavigationMenuList className="flex-wrap justify-start gap-1">
                      <DeckLayoutMenu />
                      <GroupByMenu />
                    </NavigationMenuList>
                  )}
                </NavigationMenuList>
                {owned && (
                  <NavigationMenuList className="flex-wrap justify-end gap-1">
                    <DeckLayoutMenu />
                    <GroupByMenu />
                  </NavigationMenuList>
                )}
              </DeckNavigationMenu>
            </div>
            {deckbuilder && (
              <div className="flex flex-1 flex-row gap-2 flex-wrap items-center justify-center ">
                <DeckLeaderBase deckId={deckId} size="w200" />
              </div>
            )}
            <div className="flex flex-wrap gap-4 items-center max-lg:justify-center w-full">
              <DeckBoardCardCounts deckId={deckId} />
            </div>

            {tabsValue === 'decklist' && (
              <DeckCards deckId={deckId} highlightedCardId={highlightedCardId} />
            )}
            {tabsValue === 'charts' && <DeckStats deckId={deckId} />}
          </div>
        </div>
      </div>
    </>
  );
};

export default DeckContents;
