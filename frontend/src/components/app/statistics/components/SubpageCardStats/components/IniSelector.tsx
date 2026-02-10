import * as React from 'react';
import { useCallback } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';

export interface IniSelectorProps {
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}

export const IniSelector: React.FC<IniSelectorProps> = ({ value, onChange }) => {
  const onValueChange = useCallback(
    (v: string) => {
      if (v === 'all') {
        onChange(undefined);
      } else if (v === 'true') {
        onChange(true);
      } else if (v === 'false') {
        onChange(false);
      }
    },
    [onChange],
  );

  const stringValue = value === undefined ? 'all' : value.toString();

  return (
    <ToggleGroup
      type="single"
      value={stringValue}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="all">All</ToggleGroupItem>
      <ToggleGroupItem value="true">Initiative</ToggleGroupItem>
      <ToggleGroupItem value="false">No initiative</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default IniSelector;
