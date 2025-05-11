import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Info, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import * as React from 'react';
import { formatData } from '../../../../../../types/Format.ts';
import { cn } from '@/lib/utils.ts';

interface FormatSelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
  allowEmpty?: boolean;
  className?: string;
  showInfoTooltip?: boolean;
}

const FormatSelect: React.FC<FormatSelectProps> = ({
  value,
  onChange,
  allowEmpty = true,
  className = '',
  showInfoTooltip = true,
}) => {
  const stringValue = value ? value.toString() : '';

  const handleChange = (newValue: string) => {
    if (newValue === '' || newValue === '-all-') {
      onChange(null);
    } else {
      onChange(parseInt(newValue));
    }
  };

  return (
    <div className={cn(`flex flex-row gap-2 items-center`, className)}>
      <Select value={stringValue} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select format" />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="-all-">No format</SelectItem>}
          {formatData.map(format => (
            <SelectItem key={format.id} value={format.id.toString()}>
              {format.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value !== null && allowEmpty && (
        <Button variant="outline" size="icon" onClick={() => onChange(null)}>
          <X size={16} />
        </Button>
      )}

      {showInfoTooltip && (
        <Popover>
          <PopoverTrigger>
            <Info size={16} />
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-2 text-sm max-w-md">
            <h4 className="font-bold">Format Information</h4>
            {value !== null ? (
              <div>
                <h5 className="font-semibold">{formatData.find(f => f.id === value)?.name}</h5>
                <p>{formatData.find(f => f.id === value)?.description}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formatData.map(format => (
                  <div key={format.id} className="border-b pb-2 last:border-0">
                    <h5 className="font-semibold">{format.name}</h5>
                    <p>{format.description}</p>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default FormatSelect;
