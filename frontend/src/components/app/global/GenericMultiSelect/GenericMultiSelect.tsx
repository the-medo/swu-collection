import * as React from 'react';
import { useMemo } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';

export type GenericMultiSelectProps = {
  label: string;
  placeholder: string;
  options: string[] | Set<string>;
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  maxCount?: number;
};

const GenericMultiSelect: React.FC<GenericMultiSelectProps> = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  className,
  maxCount = 3,
}) => {
  // Convert options to the format expected by the MultiSelect component
  const formattedOptions = useMemo(() => {
    const optionArray = Array.isArray(options) ? options : Array.from(options);
    return optionArray.map(option => ({
      value: option,
      label: option,
    }));
  }, [options]);

  return (
    <div className={cn('space-y-2', className)}>
      <MultiSelect
        label={label}
        options={formattedOptions}
        onValueChange={onChange}
        value={value}
        placeholder={placeholder}
        variant="inverted"
        maxCount={maxCount}
      />
    </div>
  );
};

export default GenericMultiSelect;
