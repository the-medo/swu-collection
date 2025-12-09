import { CardPoolType } from '../../../../../../shared/types/cardPools.ts';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx';
import { Label } from '@/components/ui/label.tsx';
import React from 'react';
import { cn } from '@/lib/utils.ts';

type CardPoolTypeOption = {
  value: CardPoolType;
  label: string;
  description: string;
  disabled?: boolean;
};

const cardPoolTypeOptions: CardPoolTypeOption[] = [
  {
    value: CardPoolType.Sealed,
    label: 'Sealed deck',
    description: 'Create a deck from six booster packs',
  },
  {
    value: CardPoolType.Prerelease,
    label: 'Prerelease',
    description: 'Create a deck from six booster packs + 2 bonus leaders',
  },
  /*{
    value: CardPoolType.Draft,
    label: 'Draft (not yet implemented)',
    description: 'Create a deck from drafted cards',
    disabled: true,
  },*/
];

interface CardPoolTypeSelectorProps {
  selectedType: CardPoolType;
  setSelectedType: (type: CardPoolType) => void;
  showPrerelease?: boolean;
}

const CardPoolTypeSelector: React.FC<CardPoolTypeSelectorProps> = ({
  selectedType,
  setSelectedType,
  showPrerelease = true,
}) => {
  const options = cardPoolTypeOptions.filter(
    option => showPrerelease || option.value !== CardPoolType.Prerelease,
  );
  return (
    <RadioGroup
      value={selectedType.toString()}
      onValueChange={value => setSelectedType(value as CardPoolType)}
      className="space-y-1"
    >
      {options.map(option => (
        <div
          key={option.value}
          className={cn(
            `flex items-center space-x-2 rounded-md border p-4 
                  ${selectedType === option.value ? 'border-primary bg-primary/5' : 'border-muted'}`,
            option.disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <RadioGroupItem
            disabled={option.disabled}
            value={option.value.toString()}
            id={`type-${option.value}`}
          />
          <Label
            htmlFor={`type-${option.value}`}
            className={cn(
              'flex flex-1 items-center justify-between',
              option.disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            <div className="flex items-center gap-2">
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
};

export default CardPoolTypeSelector;
