import * as React from 'react';
import { useCallback } from 'react';
import GenericToggleSelector, { ToggleOption } from '../components/GenericToggleSelector.tsx';

export type DailySnapshotMetaView = 'leaders' | 'leadersAndBase';

interface MetaViewSelectorProps {
  value: DailySnapshotMetaView;
  onChange: (value: DailySnapshotMetaView) => void;
}

const options: ToggleOption[] = [
  { value: 'leaders', label: 'Leaders' },
  { value: 'leadersAndBase', label: 'Leaders & Base' },
];

const MetaViewSelector: React.FC<MetaViewSelectorProps> = ({ value, onChange }) => {
  const onValueChange = useCallback(
    (v: string) => {
      onChange(v as DailySnapshotMetaView);
    },
    [onChange],
  );

  return <GenericToggleSelector options={options} value={value} onValueChange={onValueChange} />;
};

export default MetaViewSelector;
