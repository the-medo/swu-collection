import * as React from 'react';
import { useMemo } from 'react';
import { SwuSet } from '../../../../../types/enums.ts';
import { setArray } from '../../../../../lib/swu-resources/set-info.ts';
import { MultiSelect } from '@/components/ui/multi-select.tsx';

export type SetMultiSelectProps = {
  showFullName?: boolean;
  defaultValue: SwuSet[];
  onChange: (v: SwuSet[]) => void;
};

const SetMultiSelect: React.FC<SetMultiSelectProps> = ({
  onChange,
  defaultValue,
  showFullName = false,
}) => {
  const options = useMemo(() => {
    return setArray.map(s => ({
      value: s.code,
      label: showFullName ? s.name : s.code.toUpperCase(),
    }));
  }, [showFullName]);

  return (
    <MultiSelect
      options={options}
      onValueChange={onChange as (v: string[]) => void}
      defaultValue={defaultValue}
      placeholder="Select sets"
      variant="inverted"
      maxCount={showFullName ? 2 : 3}
    />
  );
};

export default SetMultiSelect;
