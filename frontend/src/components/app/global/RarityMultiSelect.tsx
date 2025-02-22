import * as React from 'react';
import { useMemo } from 'react';
import { SwuRarity } from '../../../../../types/enums.ts';
import { MultiSelect } from '@/components/ui/multi-select.tsx';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';

export type RarityMultiSelectProps = {
  defaultValue: SwuRarity[];
  onChange: (v: SwuRarity[]) => void;
};

const RarityMultiSelect: React.FC<RarityMultiSelectProps> = ({ onChange, defaultValue }) => {
  const options = useMemo(() => {
    return Object.values(SwuRarity).map(s => ({
      value: s.toString(),
      label: s.toString(),
      icon: () => <RarityIcon rarity={s} size="xSmall" />,
    }));
  }, []);

  return (
    <MultiSelect
      options={options}
      onValueChange={onChange as (v: string[]) => void}
      defaultValue={defaultValue}
      placeholder="Select rarities"
      variant="inverted"
      maxCount={3}
    />
  );
};

export default RarityMultiSelect;
