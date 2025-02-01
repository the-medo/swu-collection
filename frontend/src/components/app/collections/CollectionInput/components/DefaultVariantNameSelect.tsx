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

interface DefaultVariantNameSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const DefaultVariantNameSelect: React.FC<DefaultVariantNameSelectProps> = ({ value, onChange }) => {
  return (
    <>
      <div className="col-span-2 flex flex-row gap-4 items-center self-center">
        <Select value={value} defaultValue="empty" onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select default version" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="empty">No default version</SelectItem>
            <SelectItem value="Standard">
              <b>Standard</b> version by default
            </SelectItem>
            <SelectItem value="Hyperspace">
              <b>Hyperspace</b> version by default
            </SelectItem>
          </SelectContent>
        </Select>
        {value !== 'empty' && (
          <Button size="outline" size="icon" onClick={() => onChange('empty')}>
            <X size={16} />
          </Button>
        )}
      </div>
      <div className="self-center">
        <Popover>
          <PopoverTrigger>
            <Info size={16} />
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-2 text-sm">
            <h4>Default card version</h4>
            <span>
              When you set up your default version and the card you are trying to insert is
              available in this version, you will not be prompted to select a version.
            </span>
            <span>
              Only <span className="font-bold">Standard</span> and{' '}
              <span className="font-bold">Hyperspace</span> is possible to set as default. If you
              have some other versions (like showcases, prestige or promo versions) you will still
              need to select the version manually.
            </span>
            <span>You are still able to change the selected version later.</span>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

export default DefaultVariantNameSelect;
