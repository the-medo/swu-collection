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

interface GroupBySelectorProps {
  value?: DeckGroupBy;
  onChange?: (value: DeckGroupBy) => void;
}

const GroupBySelector: React.FC<GroupBySelectorProps> = ({ value, onChange }) => {
  const { groupBy: storeGroupBy } = useDeckLayoutStore();
  const { setGroupBy } = useDeckLayoutStoreActions();

  // Use provided value if available, otherwise use the store value
  const groupBy = value !== undefined ? value : storeGroupBy;

  const onValueChange = useCallback(
    (v: string) => {
      const newValue = v as DeckGroupBy;
      // Use provided onChange if available, otherwise use the store action
      if (onChange) {
        onChange(newValue);
      } else {
        setGroupBy(newValue);
      }
    },
    [onChange],
  );

  return (
    <DropdownMenu modal={true}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="text-xs w-[200px] justify-between">
          <span className="text-[1.2em] font-semibold">Group by:</span>{' '}
          {groupBy !== undefined ? deckGroupByObj[groupBy]?.title : 'Card Type'}
          <Layers className="h-4 w-4 ml-2" />
        </Button>
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
