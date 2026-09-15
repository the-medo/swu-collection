import type { ReactNode, Ref } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { cn } from '@/lib/utils.ts';

export function ToolbarButton({
  label,
  icon,
  tone,
  buttonRef,
  children,
  className,
  ...props
}: ButtonProps & {
  label: string;
  icon: ReactNode;
  tone?: 'undo' | 'bookmark' | 'report';
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">
          <Button
            ref={buttonRef}
            variant="ghost"
            size="sm"
            {...props}
            aria-label={label}
            className={cn(
              'cf-toolbar-button',
              !children && 'cf-toolbar-icon',
              tone && `cf-toolbar-${tone}`,
              className,
            )}
          >
            {icon}
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
