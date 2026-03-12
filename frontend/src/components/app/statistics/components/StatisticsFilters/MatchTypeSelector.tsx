import GenericToggleSelector from '@/components/app/global/GenericToggleSelector.tsx';
import type { ToggleOption } from '@/components/app/global/GenericToggleSelector.tsx';

export enum MatchType {
  BO1 = 'Bo1',
  BO3 = 'Bo3',
  ALL = 'All',
}

const matchTypeOptions: ToggleOption[] = [
  { value: MatchType.BO1, label: MatchType.BO1 },
  { value: MatchType.BO3, label: MatchType.BO3 },
  { value: MatchType.ALL, label: MatchType.ALL },
];

interface MatchTypeSelectorProps {
  value?: MatchType;
  onChange: (value: MatchType) => void;
}

const MatchTypeSelector: React.FC<MatchTypeSelectorProps> = ({
  value = MatchType.ALL,
  onChange,
}) => {
  return (
    <GenericToggleSelector
      options={matchTypeOptions}
      value={value}
      onValueChange={selectedValue => onChange(selectedValue as MatchType)}
    />
  );
};

export default MatchTypeSelector;
