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

export interface CardConditionSelectProps {
  onChange: (v: CardCondition | null) => void;
  value?: CardCondition | null;
  allowClear?: boolean;
  showFullName?: boolean;
}

const CardConditionSelect: React.FC<CardConditionSelectProps> = ({
  onChange,
  value,
  showFullName = false,
}) => {
  const [cardCondition, setCardCondition] = React.useState<CardCondition | null>(value ?? null);

  useEffect(() => setCardCondition(value ?? null), [value]);

  const onChangeHandler = useCallback(
    (v: string) => {
      onChange(v as unknown as CardCondition);
      setCardCondition(v as unknown as CardCondition);
    },
    [onChange],
  );

  return (
    <Select value={cardCondition?.toString() ?? undefined} onValueChange={onChangeHandler}>
      <SelectTrigger>
        <SelectValue placeholder="Condition" />
      </SelectTrigger>
      <SelectContent>
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
