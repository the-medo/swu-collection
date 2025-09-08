import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button.tsx';
import { Layers } from 'lucide-react';
import { deckGroupByArray, deckGroupByObj } from '../../../../../../../types/iterableEnumInfo.ts';
import React, { useCallback } from 'react';
import { DeckGroupBy } from '../../../../../../../types/enums.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { cn } from '@/lib/utils.ts';

interface GroupBySelectorProps {
  value?: DeckGroupBy;
  onChange?: (value: DeckGroupBy) => void;
  userSettingName?: 'deckGroupBy' | 'deckImage_groupBy';
  fullWidth?: boolean;
}

const GroupBySelector: React.FC<GroupBySelectorProps> = ({
  value,
  onChange,
  userSettingName = 'deckGroupBy',
  fullWidth = false,
}) => {
  const { data: storeGroupBy } = useGetUserSetting(userSettingName);
  const { mutate: setSetting } = useSetUserSetting(userSettingName);

  // Use provided value if available, otherwise use the store value
  const groupBy = value !== undefined ? value : storeGroupBy;

  const onValueChange = useCallback(
    (v: string) => {
      const newValue = v as DeckGroupBy;
      // Use provided onChange if available, otherwise use the store action
      if (onChange) {
        onChange(newValue);
      } else {
        setSetting(newValue);
      }
    },
    [onChange],
  );

  return (
    <DropdownMenu modal={true}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(`text-xs justify-between`, fullWidth ? 'w-full' : 'w-[200px]')}
        >
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
