import * as React from 'react';
import { useCallback } from 'react';
import GenericToggleSelector, { ToggleOption } from '../components/GenericToggleSelector.tsx';

export type DailySnapshotMetaPart = 'total' | 'top8' | 'winners';

interface MetaPartSelectorProps {
  value: DailySnapshotMetaPart;
  onChange: (value: DailySnapshotMetaPart) => void;
}

const options: ToggleOption[] = [
  { value: 'total', label: 'Total' },
  { value: 'top8', label: 'Top 8' },
  { value: 'winners', label: 'Champions' },
];

const MetaPartSelector: React.FC<MetaPartSelectorProps> = ({ value, onChange }) => {
  const onValueChange = useCallback(
    (v: string) => {
      onChange(v as DailySnapshotMetaPart);
    },
    [onChange],
  );

  return <GenericToggleSelector options={options} value={value} onValueChange={onValueChange} />;
};

export default MetaPartSelector;
