import * as React from 'react';
import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BracketInfo } from '../../../../../../types/enums.ts';

export type BracketInfoSelectProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  emptyOption?: boolean;
  className?: string;
  disabled?: boolean;
};

// Map for display names
const bracketInfoDisplayNames = {
  [BracketInfo.NONE]: 'None',
  [BracketInfo.TOP16]: 'Top 16',
  [BracketInfo.TOP8]: 'Top 8',
  [BracketInfo.TOP4]: 'Top 4',
};

const BracketInfoSelect: React.FC<BracketInfoSelectProps> = ({
  value,
  onChange,
  placeholder = 'Select bracket information',
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
        {emptyOption && <SelectItem value="-all-">All bracket types</SelectItem>}

        {Object.values(BracketInfo).map(bracketType => (
          <SelectItem key={bracketType} value={bracketType}>
            {bracketInfoDisplayNames[bracketType]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default BracketInfoSelect;