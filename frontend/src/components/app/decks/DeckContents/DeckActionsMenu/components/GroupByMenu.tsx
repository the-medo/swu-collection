import * as React from 'react';
import {
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu.tsx';
import { BarChart } from 'lucide-react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { DeckGroupBy } from '../../../../../../../../types/enums.ts';

const GroupByMenu: React.FC = () => {
  const { data: groupBy } = useGetUserSetting('deckGroupBy');
  const { mutate: setGroupBy } = useSetUserSetting('deckGroupBy');

  const groupByOptions = [
    { id: DeckGroupBy.CARD_TYPE, label: 'Card Type' },
    { id: DeckGroupBy.COST, label: 'Cost' },
    { id: DeckGroupBy.ASPECT, label: 'Aspect' },
    { id: DeckGroupBy.TRAIT, label: 'Trait' },
    { id: DeckGroupBy.KEYWORDS, label: 'Keywords' },
  ];

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="w-[220px] justify-start border">
        <BarChart className="h-4 w-4 mr-0" />
        <span className="text-xs">Group by: </span>
        {groupByOptions.find(option => option.id === groupBy)?.label || 'Default'}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="p-4 grid grid-cols-1 gap-4 w-[220px]">
          <div className="col-span-1 grid grid-cols-1 gap-1">
            {groupByOptions.map(option => (
              <li
                key={option.id}
                onClick={() => setGroupBy(option.id)}
                className="rounded hover:bg-accent hover:text-accent-foreground p-2 cursor-pointer"
              >
                <NavigationMenuLink asChild>
                  <div className="text-sm leading-none font-medium">{option.label}</div>
                </NavigationMenuLink>
              </li>
            ))}
          </div>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export default GroupByMenu;
