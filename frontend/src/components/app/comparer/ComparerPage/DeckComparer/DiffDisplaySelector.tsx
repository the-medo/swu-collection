import * as React from 'react';
import { useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button.tsx';
import { BarChart2 } from 'lucide-react';
import {
  diffDisplayModeArray,
  diffDisplayModeObj,
} from '../../../../../../../types/iterableEnumInfo.ts';
import { DiffDisplayMode } from '../../../../../../../types/enums.ts';

interface DiffDisplaySelectorProps {
  value?: DiffDisplayMode;
  onChange: (value: DiffDisplayMode) => void;
}

/**
 * Component for selecting how differences should be displayed in the deck comparer
 */
const DiffDisplaySelector: React.FC<DiffDisplaySelectorProps> = ({
  value = DiffDisplayMode.COUNT_AND_DIFF,
  onChange,
}) => {
  const onValueChange = useCallback(
    (v: string) => {
      const newValue = v as DiffDisplayMode;
      onChange(newValue);
    },
    [onChange],
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="text-xs w-[240px] justify-between">
          <span className="text-[1.2em] font-semibold">Diff mode:</span>{' '}
          {diffDisplayModeObj[value]?.title}
          <BarChart2 className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {diffDisplayModeArray.map(mode => (
            <DropdownMenuRadioItem key={mode} value={mode}>
              {diffDisplayModeObj[mode].title}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DiffDisplaySelector;
