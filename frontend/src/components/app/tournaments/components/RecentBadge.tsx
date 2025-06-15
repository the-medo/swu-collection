import React from 'react';
import { cn } from '@/lib/utils.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RecentBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

const RecentBadge: React.FC<RecentBadgeProps> = ({ 
  className, 
  showTooltip = false
}) => {
  const badgeContent = (
    <div className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800", className)}>
      Recent
    </div>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            Most recent tournament week
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
};

export default RecentBadge;