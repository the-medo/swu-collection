import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';

export interface InfoTooltipProps {
  tooltip: React.ReactNode;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ tooltip, className }) => {
  return (
    <Popover hover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Info"
          className={cn(
            'inline-flex items-center justify-center rounded p-1 hover:bg-muted/60 transition-colors',
            className,
          )}
        >
          <Info className="size-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-3 max-w-[300px]">
        <div className="flex flex-col gap-3 text-sm">{tooltip}</div>
      </PopoverContent>
    </Popover>
  );
};

export default InfoTooltip;
