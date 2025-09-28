import * as React from 'react';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import DeckCollectionInfo from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionInfo.tsx';
import { useUser } from '@/hooks/useUser.ts';

interface DecklistChartsTabsProps {
  deckId: string;
  value: string;
  onValueChange?: (value: string) => void;
}

const DecklistChartsTabs: React.FC<DecklistChartsTabsProps> = ({
  deckId,
  value,
  onValueChange,
}) => {
  const user = useUser();
  const { data: collectionInfoInDecks } = useGetUserSetting('collectionInfoInDecks');

  return (
    <NavigationMenuItem>
      <Tabs value={value} onValueChange={onValueChange} className="w-auto border rounded-md">
        <TabsList className=" bg-muted/70">
          <TabsTrigger value="decklist">Decklist</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          {user && collectionInfoInDecks && (
            <TabsTrigger value="collection">
              <span className="mr-2">Collections</span> <DeckCollectionInfo deckId={deckId} />
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>
    </NavigationMenuItem>
  );
};

export default DecklistChartsTabs;
