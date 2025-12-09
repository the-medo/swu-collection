import React from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils.ts';

export type CPIconOption = {
  value: string;
  tooltip: string;
  ariaLabel?: string;
  icon: React.ReactNode;
};

export type CPIconOptionGroupProps = {
  title: string;
  value?: string | null;
  defaultValue: string;
  options: CPIconOption[];
  onChange: (value: string) => void;
  className?: string;
};

const CPIconOptionGroup: React.FC<CPIconOptionGroupProps> = ({
  title,
  value,
  defaultValue,
  options,
  onChange,
  className,
}) => {
  const selected = (value ?? defaultValue) as string;

  return (
    <div className={cn('flex gap-2 flex-1 justify-between items-center', className)}>
      <div className="text-xs font-medium text-muted-foreground mb-1">{title}</div>
      <ButtonGroup>
        {options.map(opt => (
          <Tooltip key={opt.value}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                aria-label={opt.ariaLabel ?? opt.tooltip}
                variant={selected === opt.value ? 'default' : 'outline'}
                onClick={() => onChange(opt.value)}
              >
                {opt.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{opt.tooltip}</TooltipContent>
          </Tooltip>
        ))}
      </ButtonGroup>
    </div>
  );
};

export default CPIconOptionGroup;
