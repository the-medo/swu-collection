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

export interface CardLanguageSelectProps {
  onChange: (v: CardLanguage | null) => void;
  value?: CardLanguage | null;
  allowClear?: boolean;
  showFullName?: boolean;
}

const CardLanguageSelect: React.FC<CardLanguageSelectProps> = ({
  onChange,
  value,
  showFullName = false,
}) => {
  const [cardLanguage, setCardLanguage] = React.useState<CardLanguage | null>(value ?? null);

  useEffect(() => setCardLanguage(value ?? null), [value]);

  const onChangeHandler = useCallback(
    (v: CardLanguage) => {
      onChange(v);
      setCardLanguage(v);
    },
    [onChange],
  );

  return (
    <Select value={cardLanguage ?? undefined} onValueChange={onChangeHandler}>
      <SelectTrigger>
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
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
