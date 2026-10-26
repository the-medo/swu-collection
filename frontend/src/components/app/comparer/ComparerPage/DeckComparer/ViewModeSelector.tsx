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
import { LayoutGrid } from 'lucide-react';
import { viewModeArray, viewModeObj } from '../../../../../../../types/iterableEnumInfo.ts';
import { ViewMode } from '../../../../../../../types/enums.ts';

interface ViewModeSelectorProps {
  disabled?: boolean;
  value: ViewMode | undefined;
  onChange: (viewMode: ViewMode) => void;
}

/**
 * Component for selecting the view mode (cards in rows or decks in rows)
 */
const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  value = ViewMode.ROW_CARD,
  onChange,
  disabled = false,
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
        <Button
          disabled={disabled}
          title={disabled ? 'Combined decks use cards in rows' : undefined}
          variant="outline"
          className="h-8 max-w-full gap-2 text-xs justify-between"
        >
          <span className="text-xs text-muted-foreground">View mode:</span>{' '}
          {viewModeObj[value]?.title}
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
