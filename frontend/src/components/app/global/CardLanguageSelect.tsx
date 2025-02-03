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
  allowClear = true,
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

  const onClear = useCallback(() => {
    onChange(null);
    setCardLanguage(null);
  }, [onChange]);

  return (
    <div className="flex items-center gap-4">
      <Select value={cardLanguage ?? undefined} onValueChange={onChangeHandler}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          {languageArray.map(l => (
            <SelectItem key={l.language} value={l.language}>
              <img src={l.flag} alt="en-flag" className="w-6" />
              {CardLanguage.EN} {showFullName && `- ${l.fullName}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowClear && <Button onClick={onClear}>Clear</Button>}
    </div>
  );
};

export default CardLanguageSelect;
