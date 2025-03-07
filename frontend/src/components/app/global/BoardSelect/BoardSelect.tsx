import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export interface BoardSelectProps {
  value: number;
  onChange: (value: number) => void;
}

const BoardSelect: React.FC<BoardSelectProps> = ({ value, onChange }) => {
  return (
    <div className={cn('flex flex-wrap flex-grow items-center gap-2')}>
      <div className="flex items-center">
        <ToggleGroup
          type={'single'}
          value={value.toString()}
          onValueChange={v => onChange(Number(v))}
        >
          <ToggleGroupItem value="1">Maindeck</ToggleGroupItem>
          <ToggleGroupItem value="2">Sideboard</ToggleGroupItem>
          <ToggleGroupItem value="3">Maybeboard</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};

export default BoardSelect;
