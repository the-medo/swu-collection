import * as React from 'react';
import { X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils.ts';

type KarabastUnimplementedWarningIconProps = {
  className?: string;
  size?: 'default' | 'large';
  stopClickPropagation?: boolean;
  tooltipSide?: React.ComponentProps<typeof TooltipContent>['side'];
};

const LABEL = 'Not implemented in Karabast';

const KarabastUnimplementedWarningIcon: React.FC<KarabastUnimplementedWarningIconProps> = ({
  className,
  size = 'default',
  stopClickPropagation = false,
  tooltipSide = 'top',
}) => {
  const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    if (stopClickPropagation) {
      event.stopPropagation();
    }
  };

  const icon = (
    <span
      aria-label={LABEL}
      role="img"
      onClick={handleClick}
      onDoubleClick={handleClick}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm',
        size === 'large' ? 'h-7 w-7' : 'h-5 w-5',
        className,
      )}
    >
      <X className={cn(size === 'large' ? 'h-4 w-4' : 'h-3.5 w-3.5')} aria-hidden="true" />
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{icon}</TooltipTrigger>
      <TooltipContent side={tooltipSide}>{LABEL}</TooltipContent>
    </Tooltip>
  );
};

export default KarabastUnimplementedWarningIcon;
