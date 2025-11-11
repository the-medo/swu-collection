import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { Visibility } from '../../../../../../shared/types/visibility.ts';

export interface VisibilitySelectorProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  className?: string;
}

const VisibilitySelector: React.FC<VisibilitySelectorProps> = ({ value, onChange, className }) => {
  return (
    <ToggleGroup
      type="single"
      value={String(value)}
      onValueChange={(v: string) => {
        onChange(v as Visibility);
      }}
      className={className}
    >
      <ToggleGroupItem value={Visibility.Private}>Private</ToggleGroupItem>
      <ToggleGroupItem value={Visibility.Public}>Public</ToggleGroupItem>
      <ToggleGroupItem value={Visibility.Unlisted}>Unlisted</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default VisibilitySelector;
