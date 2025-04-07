import * as React from 'react';
import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge.tsx';
import { Trophy } from 'lucide-react';
import { tournamentTypes, tournamentTypesInfo } from '../../../../../../types/Tournament.ts';

export type TournamentTypeSelectProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  showFullName?: boolean;
  placeholder?: string;
  emptyOption?: boolean;
  className?: string;
  disabled?: boolean;
};

const TournamentTypeSelect: React.FC<TournamentTypeSelectProps> = ({
  value,
  onChange,
  showFullName = false,
  placeholder = 'Select tournament type',
  emptyOption = false,
  className,
  disabled = false,
}) => {
  const handleChange = useCallback(
    (newValue: string) => {
      if (newValue === '' || newValue === '-all-') {
        onChange(undefined);
      } else {
        onChange(newValue);
      }
    },
    [onChange],
  );

  return (
    <Select value={value || ''} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {emptyOption && <SelectItem value="-all-">All types</SelectItem>}

        {tournamentTypes.map(type => (
          <SelectItem key={type} value={type} className="flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {tournamentTypesInfo[type].major === 1 && (
                  <Trophy className="h-4 w-4 text-amber-500" />
                )}
                <span>{showFullName ? tournamentTypesInfo[type].name : type.toUpperCase()}</span>
              </div>
              {!showFullName && tournamentTypesInfo[type].major === 1 && (
                <Badge variant="outline" className="ml-2">
                  Major
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TournamentTypeSelect;
