import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button.tsx';
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
  allowClear = true,
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

  const onClear = useCallback(() => {
    onChange(null);
    setCardCondition(null);
  }, [onChange]);

  return (
    <div className="flex items-center gap-4">
      <Select value={cardCondition?.toString() ?? undefined} onValueChange={onChangeHandler}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Condition" />
        </SelectTrigger>
        <SelectContent>
          {cardConditionArray.map(l => (
            <SelectItem key={l.condition} value={l.condition.toString()}>
              {l.condition} {showFullName && `- ${l.fullName}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowClear && <Button onClick={onClear}>Clear</Button>}
    </div>
  );
};

export default CardConditionSelect;
