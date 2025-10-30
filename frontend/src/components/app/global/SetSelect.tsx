import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { SwuSet } from '../../../../../types/enums.ts';
import { setArray } from '../../../../../lib/swu-resources/set-info.ts';

export type SetSelectProps = {
  showFullName?: boolean;
} & (
  | {
      value: SwuSet;
      emptyOption: false;
      onChange: (v: SwuSet) => void;
    }
  | {
      value: SwuSet | null;
      emptyOption: true;
      onChange: (v: SwuSet | null) => void;
      allowClear?: boolean;
    }
);

const SetSelect: React.FC<SetSelectProps> = ({
  onChange,
  value,
  emptyOption,
  showFullName = false,
}) => {
  const [swuSet, setSwuSet] = React.useState<SwuSet | 'empty'>(value ?? 'empty');

  useEffect(() => setSwuSet(value ?? 'empty'), [value]);

  const onChangeHandler = useCallback(
    (v: SwuSet | 'empty') => {
      if (!emptyOption && v === 'empty') {
        throw new Error('Empty option is not allowed');
      }
      if (v === 'empty' && emptyOption) {
        setSwuSet('empty');
        onChange(null);
      } else if (v !== 'empty') {
        onChange(v);
        setSwuSet(v);
      }
    },
    [onChange],
  );

  return (
    <Select value={swuSet ?? undefined} onValueChange={onChangeHandler}>
      <SelectTrigger>
        <SelectValue placeholder="Set" />
      </SelectTrigger>
      <SelectContent>
        {emptyOption && <SelectItem value="empty">{showFullName ? '- no set -' : '-'}</SelectItem>}
        {setArray.map(s => (
          <SelectItem key={s.code} value={s.code}>
            {showFullName ? (
              <div className="flex gap-2 grow justify-between">
                <span>{s.name}</span>
                <span>[{s.code.toUpperCase()}]</span>
              </div>
            ) : (
              s.code.toUpperCase()
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SetSelect;
