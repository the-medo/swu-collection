import React from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import type { CPGroupBy } from '../useCardPoolDeckDetailStore';
import { cn } from '@/lib/utils.ts';

export interface CPGroupingSelectorProps {
  label?: string;
  value: CPGroupBy;
  onChange: (value: CPGroupBy) => void;
  className?: string;
}

const OPTIONS: { value: CPGroupBy; label: string }[] = [
  { value: 'aspect', label: 'Aspect' },
  { value: 'type', label: 'Type' },
  { value: 'cost', label: 'Cost' },
];

const CPGroupingSelector: React.FC<CPGroupingSelectorProps> = ({
  label,
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn('flex gap-2 items-center justify-between', className)}>
      {label ? <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div> : null}
      <ButtonGroup>
        {OPTIONS.map(opt => (
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
