import * as React from 'react';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';

interface DecklistChartsTabsProps {
  value: string;
  onValueChange?: (value: string) => void;
}

const DecklistChartsTabs: React.FC<DecklistChartsTabsProps> = ({ value, onValueChange }) => {
  return (
    <NavigationMenuItem>
      <Tabs
        value={value}
        onValueChange={onValueChange}
        className="w-auto border rounded-md"
      >
        <TabsList>
          <TabsTrigger value="decklist">Decklist</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
      </Tabs>
    </NavigationMenuItem>
  );
};

export default DecklistChartsTabs;