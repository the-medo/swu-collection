import * as React from 'react';
import { useCallback } from 'react';
import { ViewMode } from '@/components/app/comparer/useComparerStore.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button.tsx';
import { LayoutGrid } from 'lucide-react';
import { viewModeArray, viewModeObj } from '../../../../../../../types/iterableEnumInfo.ts';

interface ViewModeSelectorProps {
  value: ViewMode | undefined;
  onChange: (viewMode: ViewMode) => void;
}

/**
 * Component for selecting the view mode (cards in rows or decks in rows)
 */
const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  value = ViewMode.ROW_CARD,
  onChange,
}) => {
  const onValueChange = useCallback(
    (v: string) => {
      const newValue = v as ViewMode;
      onChange(newValue);
    },
    [onChange],
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="text-xs w-[250px] justify-between">
          <span className="text-[1.2em] font-semibold">View mode:</span> {viewModeObj[value]?.title}
          <LayoutGrid className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {viewModeArray.map(mode => (
            <DropdownMenuRadioItem key={mode} value={mode}>
              {viewModeObj[mode].title}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ViewModeSelector;
