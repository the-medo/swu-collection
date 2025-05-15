import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button.tsx';
import { Layers } from 'lucide-react';
import {
  DeckGroupBy,
  useDeckLayoutStore,
  useDeckLayoutStoreActions,
} from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import { deckGroupByArray, deckGroupByObj } from '../../../../../../../types/iterableEnumInfo.ts';
import React, { useCallback } from 'react';

interface GroupBySelectorProps {}

const GroupBySelector: React.FC<GroupBySelectorProps> = ({}) => {
  const { groupBy } = useDeckLayoutStore();
  const { setGroupBy } = useDeckLayoutStoreActions();

  const onValueChange = useCallback((v: string) => {
    setGroupBy(v as DeckGroupBy);
  }, []);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-semibold">Group by:</span>
          <Button variant="outline" className="text-xs w-[200px] justify-between">
            {groupBy !== undefined ? deckGroupByObj[groupBy]?.title : 'Card Type'}
            <Layers className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={groupBy} onValueChange={onValueChange}>
          {deckGroupByArray.map(g => (
            <DropdownMenuRadioItem key={g} value={g}>
              {deckGroupByObj[g].title}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GroupBySelector;