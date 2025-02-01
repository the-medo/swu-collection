import * as React from 'react';
import { Switch } from '@/components/ui/switch.tsx';

interface DefaultFoilSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const FoilSwitch: React.FC<DefaultFoilSwitchProps> = ({ value, onChange }) => {
  return (
    <>
      <label htmlFor="switch-1" className="font-semibold">
        Foil
      </label>
      <div>
        <Switch id="switch-1" value={value ? 'on' : 'off'} onCheckedChange={onChange} />
      </div>
    </>
  );
};

export default FoilSwitch;
