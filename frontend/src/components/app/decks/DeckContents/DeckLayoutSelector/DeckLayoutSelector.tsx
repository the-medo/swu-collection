import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button.tsx';
import { Eye } from 'lucide-react';
import { deckLayoutArray, deckLayoutObj } from '../../../../../../../types/iterableEnumInfo.ts';
import React, { useCallback } from 'react';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useSetUserSetting } from '@/api/user/useSetUserSetting.ts';
import { DeckLayout } from '../../../../../../../types/enums.ts';

interface DeckLayoutSelectorProps {}

const DeckLayoutSelector: React.FC<DeckLayoutSelectorProps> = ({}) => {
  const { data: layout } = useGetUserSetting('deckLayout');
  const { mutate: setSetting } = useSetUserSetting('deckLayout');

  const onValueChange = useCallback((v: string) => {
    setSetting(v as DeckLayout);
  }, []);

  return (
    <DropdownMenu modal={true}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className=" text-xs w-[200px] justify-between">
          <span className="text-[1.2em] font-semibold">View:</span>
          {layout !== undefined ? deckLayoutObj[layout]?.title : 'Unknown layout'}
          <Eye className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={layout} onValueChange={onValueChange}>
          {deckLayoutArray.map(l => (
            <DropdownMenuRadioItem key={l} value={l}>
              {deckLayoutObj[l].title}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DeckLayoutSelector;
