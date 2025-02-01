import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import * as React from 'react';
import { Switch } from '@/components/ui/switch.tsx';

interface DefaultFoilSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const DefaultFoilSwitch: React.FC<DefaultFoilSwitchProps> = ({ value, onChange }) => {
  return (
    <>
      <div className="self-center">
        <Switch id="switch-1" value={value ? 'on' : 'off'} onCheckedChange={onChange} />
      </div>
      <div className="flex flex-col justify-center self-center">
        <label htmlFor="switch-1" className="font-semibold">
          Always foil
        </label>
      </div>
      <div className="self-center">
        <Popover>
          <PopoverTrigger>
            <Info size={16} />
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-2 text-sm">
            <h4>Always foil</h4>
            <span>You are still able to change the selected version later.</span>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

export default DefaultFoilSwitch;
