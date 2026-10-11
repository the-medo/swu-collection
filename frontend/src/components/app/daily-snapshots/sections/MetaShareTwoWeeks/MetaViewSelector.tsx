import * as React from 'react';
import { useCallback } from 'react';
import GenericToggleSelector, { ToggleOption } from '../../../global/GenericToggleSelector.tsx';

export type DailySnapshotMetaView = 'leaders' | 'leadersAndBase';

interface MetaViewSelectorProps {
  value: DailySnapshotMetaView;
  onChange: (value: DailySnapshotMetaView) => void;
  ariaLabel?: string;
  className?: string;
}

const options: ToggleOption[] = [
  { value: 'leaders', label: 'Leaders' },
  { value: 'leadersAndBase', label: 'Leaders & Base' },
];

const MetaViewSelector: React.FC<MetaViewSelectorProps> = ({
  value,
  onChange,
  ariaLabel,
  className,
}) => {
  const onValueChange = useCallback(
    (v: string) => {
      onChange(v as DailySnapshotMetaView);
    },
    [onChange],
  );

  return (
    <GenericToggleSelector
      options={options}
      value={value}
      onValueChange={onValueChange}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
};

export default MetaViewSelector;
