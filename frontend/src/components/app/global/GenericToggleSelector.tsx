import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useCallback } from 'react';

export interface ToggleOption {
  value: string;
  label: string;
}

interface GenericToggleSelectorProps {
  options: ToggleOption[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

const GenericToggleSelector: React.FC<GenericToggleSelectorProps> = ({
  options,
  value,
  onValueChange,
  ariaLabel,
  className,
}) => {
  const handleValueChange = useCallback(
    (v: string) => {
      // If v is empty (deselection), don't update the value
      if (v) {
        onValueChange(v);
      }
    },
    [onValueChange],
  );

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={handleValueChange}
      aria-label={ariaLabel}
      className={className}
    >
      {options.map(option => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

export default GenericToggleSelector;
