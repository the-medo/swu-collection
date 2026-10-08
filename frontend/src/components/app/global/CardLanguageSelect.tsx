import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as React from 'react';
import { useCallback } from 'react';
import { CardLanguage } from '../../../../../types/enums.ts';
import { languageArray } from '../../../../../types/iterableEnumInfo.ts';

export type CardLanguageSelectProps = {
  id?: string;
  disabled?: boolean;
  compact?: boolean;
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
  id,
  disabled,
  compact = false,
  onChange,
  value,
  emptyOption,
  showFullName = false,
}) => {
  const onChangeHandler = useCallback(
    (v: CardLanguage | 'empty') => {
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
        <SelectValue placeholder="Language">
          {compact && value ? (
            <span className="flex items-center gap-1.5">
              <img
                src={languageArray.find(l => l.language === value)?.flag}
                alt=""
                className="w-5"
              />
              {value}
            </span>
          ) : undefined}
        </SelectValue>
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
