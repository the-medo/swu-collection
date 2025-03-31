import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useBoardDeckData } from '@/components/app/global/BoardSelect/useBoardDeckData.ts';

const boardObj: Record<number, { name: string; shortName: string }> = {
  1: { name: 'Maindeck', shortName: 'MD' },
  2: { name: 'Sideboard', shortName: 'SB' },
  3: { name: 'Maybeboard', shortName: 'MB' },
};

export interface BoardSelectProps {
  deckId: string;
  value: number;
  onChange: (value: number) => void;
}

const BoardSelect: React.FC<BoardSelectProps> = ({ deckId, value, onChange }) => {
  const boardCardCounts = useBoardDeckData(deckId);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-semibold">Insert into:</span>
          <Button variant="outline" className="w-[70px] text-xs justify-between">
            {boardObj[value].shortName}
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value.toString()} onValueChange={v => onChange(Number(v))}>
          {[1, 2, 3].map(l => (
            <DropdownMenuRadioItem key={l} value={l.toString()}>
              {boardObj[l].name} ({boardCardCounts[l]})
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BoardSelect;
