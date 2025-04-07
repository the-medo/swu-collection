import * as React from 'react';
import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

export const continents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

export type ContinentSelectProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  emptyOption?: boolean;
  className?: string;
  disabled?: boolean;
};

const ContinentSelect: React.FC<ContinentSelectProps> = ({
  value,
  onChange,
  placeholder = 'Select continent',
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
        {emptyOption && <SelectItem value="-all-">All continents</SelectItem>}

        {continents.map(continent => (
          <SelectItem key={continent} value={continent}>
            {continent}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ContinentSelect;
