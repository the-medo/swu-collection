import * as React from 'react';
import { ViewMode } from '@/components/app/comparer/useComparerStore.ts';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';

interface ViewModeSelectorProps {
  value: ViewMode | undefined;
  onChange: (viewMode: ViewMode) => void;
}

/**
 * Component for selecting the view mode (cards in rows or decks in rows)
 */
const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col">
      <span className="text-sm mb-1">View Mode</span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className={cn('px-2 py-1 h-auto', {
            'bg-primary text-primary-foreground': value === ViewMode.ROW_CARD,
          })}
          onClick={() => onChange(ViewMode.ROW_CARD)}
        >
          Cards in Rows
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn('px-2 py-1 h-auto', {
            'bg-primary text-primary-foreground': value === ViewMode.ROW_DECK,
          })}
          onClick={() => onChange(ViewMode.ROW_DECK)}
        >
          Decks in Rows
        </Button>
      </div>
    </div>
  );
};

export default ViewModeSelector;