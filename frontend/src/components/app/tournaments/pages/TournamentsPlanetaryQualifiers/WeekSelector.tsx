import * as React from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { TournamentGroupWithMeta } from '../../../../../../../types/TournamentGroup.ts';

// Define the props for the processed tournament group items
interface ProcessedTournamentGroup extends TournamentGroupWithMeta {
  weekNumber: number;
  description: string;
  isMostRecent: boolean;
  isUpcoming: boolean;
}

interface WeekSelectorProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  processedTournamentGroups: ProcessedTournamentGroup[];
}

const WeekSelector: React.FC<WeekSelectorProps> = ({
  value,
  onValueChange,
  processedTournamentGroups,
}) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full p-4 h-12 hover:bg-accent">
        <SelectValue placeholder="Select a tournament week" />
      </SelectTrigger>
      <SelectContent className="p-4">
        {processedTournamentGroups.map(group => (
          <SelectItem key={group.group.id} value={group.group.id} disabled={group.isUpcoming}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <span className="font-medium text-xl">Week {group.weekNumber}</span>
                <p className="text-md text-muted-foreground ml-4">{group.description}</p>
              </div>
              {(group.isMostRecent || group.isUpcoming) && (
                <Badge variant={group.isMostRecent ? 'default' : 'outline'} className="ml-4">
                  {group.isMostRecent ? 'Most Recent' : 'Upcoming'}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default WeekSelector;
