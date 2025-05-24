import * as React from 'react';
import { DiffDisplayMode } from '@/components/app/comparer/useComparerStore.ts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { Label } from '@/components/ui/label.tsx';

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
  const handleValueChange = (newValue: string) => {
    if (newValue) {
      onChange(newValue as DiffDisplayMode);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Label htmlFor="diff-display-mode">Difference Display Mode:</Label>
      <ToggleGroup
        id="diff-display-mode"
        type="single"
        value={value}
        onValueChange={handleValueChange}
        className="justify-start"
      >
        <ToggleGroupItem value={DiffDisplayMode.COUNT_AND_DIFF} aria-label="Count and Difference">
          Count + Diff
        </ToggleGroupItem>
        <ToggleGroupItem value={DiffDisplayMode.COUNT_ONLY} aria-label="Count Only">
          Count Only
        </ToggleGroupItem>
        <ToggleGroupItem value={DiffDisplayMode.DIFF_ONLY} aria-label="Difference Only">
          Diff Only
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default DiffDisplaySelector;
