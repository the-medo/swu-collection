import React from 'react';
import { formatDistanceToNow, differenceInDays, differenceInWeeks, differenceInMonths, isSameDay, isPast, format } from 'date-fns';
import { cn } from '@/lib/utils.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UpcomingBadgeProps {
  date: string;
  className?: string;
  showTooltip?: boolean;
  showPast?: boolean;
}

const UpcomingBadge: React.FC<UpcomingBadgeProps> = ({ 
  date, 
  className, 
  showTooltip = false,
  showPast = false 
}) => {
  const tournamentDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

  // Check if date is in the past and showPast is false
  if (isPast(tournamentDate) && !isSameDay(tournamentDate, today) && !showPast) {
    return null;
  }

  // Format the relative time based on the requirements
  const getRelativeTimeText = () => {
    // If the date is today
    if (isSameDay(tournamentDate, today)) {
      return 'Today';
    }

    const days = differenceInDays(tournamentDate, today);
    const weeks = differenceInWeeks(tournamentDate, today);
    const months = differenceInMonths(tournamentDate, today);

    // Handle past dates
    if (days < 0) {
      const absDays = Math.abs(days);
      const absWeeks = Math.abs(weeks);
      const absMonths = Math.abs(months);

      // For 1 day ago
      if (absDays === 1) {
        return 'Yesterday';
      }

      // For days (2-6 days ago)
      if (absDays > 1 && absDays < 7) {
        return `${absDays} days ago`;
      }

      // For weeks
      if (absWeeks === 1) {
        return 'Last week';
      }

      if (absWeeks > 1 && absWeeks < 4) {
        return `${absWeeks} weeks ago`;
      }

      // For months
      if (absMonths === 1) {
        return 'Last month';
      }

      if (absMonths > 1) {
        return `${absMonths} months ago`;
      }

      return formatDistanceToNow(tournamentDate, { addSuffix: true });
    }

    // For future dates (original logic)
    // For 1 day
    if (days === 1) {
      return 'Tomorrow';
    }

    // For days (2-6 days)
    if (days > 1 && days < 7) {
      return `In ${days} days`;
    }

    // For weeks
    if (weeks === 1) {
      return 'Next week';
    }

    if (weeks > 1 && weeks < 4) {
      return `In ${weeks} weeks`;
    }

    // For months
    if (months === 1) {
      return 'Next month';
    }

    if (months > 1) {
      return `In ${months} months`;
    }

    // Fallback to a generic format
    return formatDistanceToNow(tournamentDate, { addSuffix: true });
  };

  const badgeContent = (
    <div className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800", className)}>
      {getRelativeTimeText()}
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
            {format(tournamentDate, 'PPP')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
};

export default UpcomingBadge;
