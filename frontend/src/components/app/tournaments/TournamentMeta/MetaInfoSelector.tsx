import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useCallback } from 'react';

export type MetaInfo =
  | 'leaders'
  | 'leadersAndBase'
  | 'bases'
  | 'aspects'
  | 'aspectsBase'
  | 'aspectsDetailed';

export const metaInfoArray: [string, ...string[]] = [
  'leaders',
  'leadersAndBase',
  'bases',
  'aspects',
  'aspectsBase',
  'aspectsDetailed',
] as const;

interface MetaInfoSelectorProps {
  value: MetaInfo;
  onChange: (value: MetaInfo) => void;
}

const MetaInfoSelector: React.FC<MetaInfoSelectorProps> = ({ value, onChange }) => {
  const onValueChange = useCallback(
    (v: string) => {
      // If v is empty (deselection), don't update the value
      if (v) {
        onChange(v as MetaInfo);
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
      <ToggleGroupItem value="leaders">Leaders</ToggleGroupItem>
      <ToggleGroupItem value="leadersAndBase">Leaders & Bases</ToggleGroupItem>
      <ToggleGroupItem value="bases">Bases</ToggleGroupItem>
      <ToggleGroupItem value="aspects">Aspects</ToggleGroupItem>
      <ToggleGroupItem value="aspectsBase">Aspects (Base)</ToggleGroupItem>
      <ToggleGroupItem value="aspectsDetailed">Aspects (Detailed)</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default MetaInfoSelector;
