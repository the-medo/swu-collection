import * as React from 'react';
import { Switch } from '@/components/ui/switch.tsx';

interface DefaultFoilSwitchProps {
  id?: string;
  disabled?: boolean;
  value: boolean;
  onChange: (value: boolean) => void;
}

const FoilSwitch: React.FC<DefaultFoilSwitchProps> = ({
  id = 'switch-1',
  disabled,
  value,
  onChange,
}) => {
  return (
    <div className="flex flex-row items-center gap-2">
      <label htmlFor={id} className="font-semibold">
        Foil
      </label>
      <Switch id={id} checked={value} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
};

export default FoilSwitch;
