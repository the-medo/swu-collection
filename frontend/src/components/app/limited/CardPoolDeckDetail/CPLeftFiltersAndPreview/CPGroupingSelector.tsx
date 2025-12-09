import React from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { CPBoxedGroupBy, CPGroupBy } from '../useCardPoolDeckDetailStore';
import { cn } from '@/lib/utils.ts';

export type CPGroupingSelectorProps = {
  label?: string;
  className?: string;
} & (
  | {
      showX?: false;
      value: CPGroupBy;
      onChange: (value: CPGroupBy) => void;
    }
  | {
      showX: true;
      value: CPBoxedGroupBy;
      onChange: (value: CPBoxedGroupBy) => void;
    }
);

const BOX_OPTIONS: { value: CPBoxedGroupBy; label: string }[] = [{ value: 'X', label: 'X' }];

const SHARED_OPTIONS: { value: CPGroupBy; label: string }[] = [
  { value: 'aspect', label: 'Aspect' },
  { value: 'type', label: 'Type' },
  { value: 'cost', label: 'Cost' },
];

const CPGroupingSelector: React.FC<CPGroupingSelectorProps> = ({
  showX,
  label,
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn('flex gap-2 items-center justify-between', className)}>
      {label ? <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div> : null}
      <ButtonGroup>
        {showX &&
          BOX_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              size="sm"
              variant={value === opt.value ? 'default' : 'outline'}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        {SHARED_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            size="sm"
            variant={value === opt.value ? 'default' : 'outline'}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
};

export default CPGroupingSelector;
