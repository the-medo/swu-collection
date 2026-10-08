import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as React from 'react';
import { useCallback } from 'react';
import { CardCondition } from '../../../../../types/enums.ts';
import { cardConditionArray } from '../../../../../types/iterableEnumInfo.ts';

export type CardConditionSelectProps = {
  id?: string;
  disabled?: boolean;
  compact?: boolean;
  showFullName?: boolean;
} & (
  | {
      value: CardCondition;
      emptyOption: false;
      onChange: (v: CardCondition) => void;
    }
  | {
      value: CardCondition | null;
      emptyOption: true;
      onChange: (v: CardCondition | null) => void;
      allowClear?: boolean;
    }
);

const CardConditionSelect: React.FC<CardConditionSelectProps> = ({
  id,
  disabled,
  compact = false,
  onChange,
  value,
  emptyOption,
  showFullName = false,
}) => {
  const onChangeHandler = useCallback(
    (v: CardCondition | 'empty') => {
      if (!emptyOption && v === 'empty') {
        throw new Error('Empty option is not allowed');
      }
      if (v === 'empty' && emptyOption) {
        onChange(null);
      } else if (v !== 'empty') {
        onChange(v);
      }
    },
    [onChange, emptyOption],
  );

  return (
    <Select value={value ?? 'empty'} onValueChange={onChangeHandler} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Condition">{compact && value ? value : undefined}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {emptyOption && (
          <SelectItem value="empty">{showFullName ? '- no condition -' : '-'}</SelectItem>
        )}
        {cardConditionArray.map(l => (
          <SelectItem key={l.condition} value={l.condition.toString()}>
            {l.shortName} {showFullName && `- ${l.fullName}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CardConditionSelect;
