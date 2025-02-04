import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { CardCondition } from '../../../../../types/enums.ts';
import { cardConditionArray } from '../../../../../types/iterableEnumInfo.ts';

export type CardConditionSelectProps = {
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
  onChange,
  value,
  emptyOption,
  showFullName = false,
}) => {
  // When emptyOption is allowed, state can be "empty" or a CardCondition.
  const [cardCondition, setCardCondition] = React.useState<CardCondition | 'empty'>(
    value ?? 'empty',
  );

  useEffect(() => {
    setCardCondition(value ?? 'empty');
  }, [value]);

  const onChangeHandler = useCallback(
    (v: CardCondition | 'empty') => {
      if (!emptyOption && v === 'empty') {
        throw new Error('Empty option is not allowed');
      }
      if (v === 'empty' && emptyOption) {
        setCardCondition('empty');
        onChange(null);
      } else if (v !== 'empty') {
        setCardCondition(v);
        onChange(v);
      }
    },
    [onChange, emptyOption],
  );

  return (
    <Select
      value={cardCondition === 'empty' ? undefined : cardCondition}
      onValueChange={onChangeHandler}
    >
      <SelectTrigger>
        <SelectValue placeholder="Condition" />
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
