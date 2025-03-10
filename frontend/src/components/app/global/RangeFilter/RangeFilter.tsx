import * as React from 'react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type RangeFilterType = {
  min?: number;
  max?: number;
};

interface RangeFilterProps {
  label: string;
  value: RangeFilterType;
  onChange: (value: RangeFilterType) => void;
  className?: string;
}

const RangeFilter: React.FC<RangeFilterProps> = ({ label, value, onChange, className }) => {
  const [min, setMin] = useState<string>(value.min?.toString() || '');
  const [max, setMax] = useState<string>(value.max?.toString() || '');

  // Update component state when props change
  useEffect(() => {
    setMin(value.min?.toString() || '');
    setMax(value.max?.toString() || '');
  }, [value]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = e.target.value;
    setMin(newMin);

    // Only trigger onChange if value is valid number or empty
    if (newMin === '' || !isNaN(Number(newMin))) {
      onChange({
        ...value,
        min: newMin === '' ? undefined : Number(newMin),
      });
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = e.target.value;
    setMax(newMax);

    // Only trigger onChange if value is valid number or empty
    if (newMax === '' || !isNaN(Number(newMax))) {
      onChange({
        ...value,
        max: newMax === '' ? undefined : Number(newMax),
      });
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Min"
          value={min}
          onChange={handleMinChange}
          className="w-24"
        />
        <span>to</span>
        <Input
          type="number"
          placeholder="Max"
          value={max}
          onChange={handleMaxChange}
          className="w-24"
        />
      </div>
    </div>
  );
};

export default RangeFilter;
