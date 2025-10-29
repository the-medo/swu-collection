import React, { useMemo } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import AspectIcon from '@/components/app/global/icons/AspectIcon';
import { cn } from '@/lib/utils';
import { SwuAspect } from '../../../../../../types/enums';
import { Button } from '@/components/ui/button.tsx';
import { aspectArray } from '../../../../../../types/iterableEnumInfo.ts';

export interface MultiAspectFilterProps {
  value: SwuAspect[];
  onChange: (value: SwuAspect[]) => void;
  multiSelect?: boolean;
  multiMainAspects?: boolean;
  showAllOption?: boolean;
  showNoneOption?: boolean;
  showLabel?: boolean;
  labelSize?: 'sm' | 'md' | 'lg';
  iconSize?: 'xSmall' | 'small' | 'medium' | 'original';
  className?: string;
  allLabel?: string;
  noneLabel?: string;
  availableAspects?: SwuAspect[];
}

const MultiAspectFilter: React.FC<MultiAspectFilterProps> = ({
  value,
  onChange,
  multiSelect = false,
  multiMainAspects = false,
  showAllOption = true,
  showNoneOption = true,
  showLabel = true,
  labelSize = 'md',
  iconSize = 'small',
  className,
  allLabel = 'All',
  noneLabel = 'None',
  availableAspects,
}) => {
  const possibleAspects = availableAspects ?? aspectArray;

  const handleAllSelection = () => {
    onChange(possibleAspects);
  };
  const handleNoneSelection = () => {
    onChange([]);
  };

  const handleAspectSelectionMultiple = (aspect: SwuAspect[]) => {
    if (multiMainAspects) return onChange(aspect);

    const notInValue = aspect.filter(a => !value.includes(a))[0];
    const inValue = value.filter(a => !aspect.includes(a))[0];
    const selectedHV = aspect.filter(a => a === SwuAspect.HEROISM || a === SwuAspect.VILLAINY);
    const valueNonHV = value.filter(a => a !== SwuAspect.HEROISM && a !== SwuAspect.VILLAINY);

    if (inValue && valueNonHV.length === 4) {
      onChange([inValue, ...selectedHV]);
      return;
    }

    if (notInValue) {
      if ([SwuAspect.HEROISM, SwuAspect.VILLAINY].includes(notInValue)) {
        onChange(aspect);
      } else {
        let uniq = Array.from(new Set([notInValue, ...selectedHV]));
        onChange(uniq);
      }
    } else {
      onChange(aspect);
    }
  };

  const handleAspectSelectionSingle = (aspect: SwuAspect) => {
    onChange([aspect]);
  };

  const getLabelClass = () => {
    switch (labelSize) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  const toggleGroupClassNames = cn('flex justify-start flex-wrap');

  const aspectOptions = useMemo(() => {
    return possibleAspects.map(aspect => (
      <ToggleGroupItem
        key={aspect}
        value={aspect}
        className={cn('flex items-center gap-1 py-1', {
          // 'ml-8': aspect === SwuAspect.HEROISM || aspect === SwuAspect.VIGILANCE,
        })}
      >
        <AspectIcon aspect={aspect} size={iconSize} />
        {showLabel && <span className={getLabelClass()}>{aspect}</span>}
      </ToggleGroupItem>
    ));
  }, [showLabel, possibleAspects]);

  return (
    <div className={cn('flex flex-wrap grow justify-center items-center gap-2', className)}>
      {showAllOption && <Button onClick={handleAllSelection}>{allLabel}</Button>}
      {showNoneOption && <Button onClick={handleNoneSelection}>{noneLabel}</Button>}
      <div className="flex items-center">
        {multiSelect ? (
          <ToggleGroup
            type={'multiple'}
            value={value}
            className={toggleGroupClassNames}
            onValueChange={handleAspectSelectionMultiple}
          >
            {aspectOptions}
          </ToggleGroup>
        ) : (
          <ToggleGroup
            type={'single'}
            value={value[0]}
            className=""
            onValueChange={handleAspectSelectionSingle}
          >
            {aspectOptions}
          </ToggleGroup>
        )}
      </div>
    </div>
  );
};

export default MultiAspectFilter;
