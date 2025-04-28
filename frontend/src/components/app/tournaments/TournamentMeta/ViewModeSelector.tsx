import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useCallback } from 'react';
import { BarChart, TableIcon } from 'lucide-react';

export type ViewMode = 'chart' | 'table';

interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ value, onChange }) => {
  const onValueChange = useCallback(
    (v: string) => {
      // If v is empty (deselection), don't update the value
      if (v) {
        onChange(v as ViewMode);
      }
    },
    [onChange],
  );

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="chart">
        <BarChart className="h-4 w-4 mr-2" />
        Chart
      </ToggleGroupItem>
      <ToggleGroupItem value="table">
        <TableIcon className="h-4 w-4 mr-2" />
        Table
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ViewModeSelector;