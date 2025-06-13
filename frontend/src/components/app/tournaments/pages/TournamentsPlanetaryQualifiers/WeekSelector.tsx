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
import { cn } from '@/lib/utils.ts';

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

// Special value for "All weeks" option
export const ALL_WEEKS_VALUE = 'all';

const WeekSelector: React.FC<WeekSelectorProps> = ({
  value,
  onValueChange,
  processedTournamentGroups,
}) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn('w-full p-4 h-12', {
          'bg-primary/20 hover:bg-accent': value === ALL_WEEKS_VALUE,
          'bg-accent hover:bg-primary/20': value !== ALL_WEEKS_VALUE,
        })}
      >
        <SelectValue placeholder="Select a tournament week" />
      </SelectTrigger>
      <SelectContent className="p-4">
        {/* All weeks option */}
        <SelectItem key={ALL_WEEKS_VALUE} value={ALL_WEEKS_VALUE} className="">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <span className="font-medium text-xl">All weeks</span>
              <p className="text-md text-muted-foreground ml-4">Combined data from all weeks</p>
            </div>
            <Badge variant="secondary" className="ml-4 bg-primary/20">
              Combined
            </Badge>
          </div>
        </SelectItem>

        {/* Individual weeks */}
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
