import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { ALL_WEEKS_VALUE } from './WeekSelector.tsx';

// Define the props for the processed tournament group items (same as in WeekSelector)
interface ProcessedTournamentGroup {
  group: {
    id: string;
  };
  weekNumber: number;
  description: string;
  isMostRecent: boolean;
  isUpcoming: boolean;
}

interface WeekChangeButtonsProps {
  selectedGroupId: string | null;
  processedTournamentGroups: ProcessedTournamentGroup[];
  onWeekChange: (tournamentGroupId: string) => void;
}

const WeekChangeButtons: React.FC<WeekChangeButtonsProps> = ({
  selectedGroupId,
  processedTournamentGroups,
  onWeekChange,
}) => {
  // State to control tooltip visibility
  const [leftTooltipOpen, setLeftTooltipOpen] = useState(false);
  const [rightTooltipOpen, setRightTooltipOpen] = useState(false);

  // Filter out upcoming weeks and sort by week number
  const availableGroups = React.useMemo(() => {
    return processedTournamentGroups
      .filter(group => !group.isUpcoming)
      .sort((a, b) => a.weekNumber - b.weekNumber);
  }, [processedTournamentGroups]);

  // Find the most recent group
  const mostRecentGroup = React.useMemo(() => {
    return processedTournamentGroups.find(group => group.isMostRecent);
  }, [processedTournamentGroups]);

  // Find the current group index
  const currentGroupIndex = React.useMemo(() => {
    if (selectedGroupId === ALL_WEEKS_VALUE) {
      return -1; // Special case for "all"
    }
    return availableGroups.findIndex(group => group.group.id === selectedGroupId);
  }, [selectedGroupId, availableGroups]);

  // Handle left button click
  const handlePreviousWeek = () => {
    // Keep the tooltip open
    setLeftTooltipOpen(true);

    if (selectedGroupId === ALL_WEEKS_VALUE) {
      // If "all" is selected, go to the most recent week
      if (mostRecentGroup) {
        onWeekChange(mostRecentGroup.group.id);
      }
    } else if (currentGroupIndex === 0) {
      // If week 1 is selected, go to "all"
      onWeekChange(ALL_WEEKS_VALUE);
    } else if (currentGroupIndex > 0) {
      // Go to the previous week
      onWeekChange(availableGroups[currentGroupIndex - 1].group.id);
    }
  };

  // Handle right button click
  const handleNextWeek = () => {
    // Keep the tooltip open
    setRightTooltipOpen(true);

    if (selectedGroupId === ALL_WEEKS_VALUE) {
      // If "all" is selected, go to week 1
      if (availableGroups.length > 0) {
        onWeekChange(availableGroups[0].group.id);
      }
    } else if (mostRecentGroup && selectedGroupId === mostRecentGroup.group.id) {
      // If most recent week is selected, go to "all"
      onWeekChange(ALL_WEEKS_VALUE);
    } else if (currentGroupIndex >= 0 && currentGroupIndex < availableGroups.length - 1) {
      // Go to the next week
      onWeekChange(availableGroups[currentGroupIndex + 1].group.id);
    }
  };

  // Determine tooltip text for left button
  const getLeftTooltip = () => {
    if (selectedGroupId === ALL_WEEKS_VALUE) {
      return 'Go to most recent week';
    } else if (currentGroupIndex === 0) {
      return 'Go to all weeks';
    } else {
      return `Go to Week ${availableGroups[currentGroupIndex - 1]?.weekNumber}`;
    }
  };

  // Determine tooltip text for right button
  const getRightTooltip = () => {
    if (selectedGroupId === ALL_WEEKS_VALUE) {
      return 'Go to Week 1';
    } else if (mostRecentGroup && selectedGroupId === mostRecentGroup.group.id) {
      return 'Go to all weeks';
    } else {
      return `Go to Week ${availableGroups[currentGroupIndex + 1]?.weekNumber}`;
    }
  };

  return (
    <div className="flex w-[100px] gap-1">
      <TooltipProvider>
        <Tooltip 
          delayDuration={0} 
          open={leftTooltipOpen} 
          onOpenChange={setLeftTooltipOpen}
        >
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={handlePreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{getLeftTooltip()}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip 
          delayDuration={0} 
          open={rightTooltipOpen} 
          onOpenChange={setRightTooltipOpen}
        >
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="h-12 w-12" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{getRightTooltip()}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default WeekChangeButtons;
