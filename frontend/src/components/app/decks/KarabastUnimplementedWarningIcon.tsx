import * as React from 'react';
import { TriangleAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils.ts';

type KarabastUnimplementedWarningIconProps = {
  className?: string;
  stopClickPropagation?: boolean;
  tooltipSide?: React.ComponentProps<typeof TooltipContent>['side'];
};

const LABEL = 'Not implemented in Karabast';

const KarabastUnimplementedWarningIcon: React.FC<KarabastUnimplementedWarningIconProps> = ({
  className,
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
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm',
        className,
      )}
    >
      <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
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
