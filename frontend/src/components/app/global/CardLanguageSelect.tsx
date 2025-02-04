import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { CardLanguage } from '../../../../../types/enums.ts';
import { languageArray } from '../../../../../types/iterableEnumInfo.ts';

export type CardLanguageSelectProps = {
  showFullName?: boolean;
} & (
  | {
      value: CardLanguage;
      emptyOption: false;
      onChange: (v: CardLanguage) => void;
    }
  | {
      value: CardLanguage | null;
      emptyOption: true;
      onChange: (v: CardLanguage | null) => void;
      allowClear?: boolean;
    }
);

const CardLanguageSelect: React.FC<CardLanguageSelectProps> = ({
  onChange,
  value,
  emptyOption,
  showFullName = false,
}) => {
  const [cardLanguage, setCardLanguage] = React.useState<CardLanguage | 'empty'>(value ?? 'empty');

  useEffect(() => setCardLanguage(value ?? 'empty'), [value]);

  const onChangeHandler = useCallback(
    (v: CardLanguage | 'empty') => {
      if (!emptyOption && v === 'empty') {
        throw new Error('Empty option is not allowed');
      }
      if (v === 'empty' && emptyOption) {
        setCardLanguage('empty');
        onChange(null);
      } else if (v !== 'empty') {
        onChange(v);
        setCardLanguage(v);
      }
    },
    [onChange],
  );

  return (
    <Select value={cardLanguage ?? undefined} onValueChange={onChangeHandler}>
      <SelectTrigger>
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {emptyOption && (
          <SelectItem value="empty">{showFullName ? '- no language -' : '-'}</SelectItem>
        )}
        {languageArray.map(l => (
          <SelectItem key={l.language} value={l.language}>
            <div className="flex items-center gap-2">
              <img src={l.flag} alt="en-flag" className="w-6" />
              {showFullName && `${l.language} - ${l.fullName}`}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CardLanguageSelect;
