import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Button } from '@/components/ui/button.tsx';
import { X } from 'lucide-react';
import * as React from 'react';
import { KarabastSwuGameFormat } from '../../../../../../../../types/karabastTypes.ts';
import { cn } from '@/lib/utils.ts';

interface KarabastFormatSelectProps {
  value: KarabastSwuGameFormat | null;
  onChange: (value: KarabastSwuGameFormat | null) => void;
  allowEmpty?: boolean;
  className?: string;
}

const KarabastFormatSelect: React.FC<KarabastFormatSelectProps> = ({
  value,
  onChange,
  allowEmpty = true,
  className = '',
}) => {
  const stringValue = value || '-all-';

  const handleChange = (newValue: string) => {
    if (newValue === '-all-') {
      onChange(null);
    } else {
      onChange(newValue as KarabastSwuGameFormat);
    }
  };

  const formatOptions = Object.entries(KarabastSwuGameFormat).map(([key, val]) => ({
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    value: val,
  }));

  return (
    <div className={cn(`flex flex-row gap-2 items-center`, className)}>
      <Select value={stringValue} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select Karabast format" />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="-all-">No format</SelectItem>}
          {formatOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value !== null && allowEmpty && (
        <Button variant="outline" size="icon" onClick={() => onChange(null)}>
          <X size={16} />
        </Button>
      )}
    </div>
  );
};

export default KarabastFormatSelect;
