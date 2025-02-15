import * as React from 'react';
import { Switch } from '@/components/ui/switch.tsx';

interface DefaultFoilSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const FoilSwitch: React.FC<DefaultFoilSwitchProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-row items-center gap-2">
      <label htmlFor="switch-1" className="font-semibold">
        Foil
      </label>
      <Switch id="switch-1" checked={value} onCheckedChange={onChange} />
    </div>
  );
};

export default FoilSwitch;
