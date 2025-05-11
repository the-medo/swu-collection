import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCountryList } from '@/api/lists/useCountryList.ts';
import * as React from 'react';
import { CountryCode } from '../../../../../server/db/lists.ts';
import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';

export interface CountrySelectorProps {
  onChangeCountry: (v: CountryCode | null) => void;
  value?: CountryCode | null;
  allowClear?: boolean;
  fullWidth?: boolean;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  onChangeCountry,
  value,
  allowClear = true,
  fullWidth = false,
}) => {
  const [country, setCountry] = React.useState<CountryCode | null>(value ?? null);
  const { data: data } = useCountryList();

  useEffect(() => {
    setCountry(value ?? null);
  }, [value]);

  const countryKeys = useMemo(
    () => (data?.countries ? Object.keys(data.countries) : []) as CountryCode[],
    [data?.countries],
  );

  const onChangeHandler = useCallback(
    (v: CountryCode) => {
      onChangeCountry(v);
      setCountry(v);
    },
    [onChangeCountry],
  );

  const onClear = useCallback(() => {
    onChangeCountry(null);
    setCountry(null);
  }, [onChangeCountry]);

  const selectedCountry = useMemo(
    () => (country ? data?.countries[country] : undefined),
    [data?.countries, country],
  );

  /* hotfix */
  const onOpenChange = useCallback(() => {
    setTimeout(() => {
      document.body.style.pointerEvents = 'auto';
    }, 100);
  }, []);

  return (
    <div className="flex items-center gap-4">
      <Select value={country ?? ''} onValueChange={onChangeHandler} onOpenChange={onOpenChange}>
        <SelectTrigger
          className={cn({
            'w-full': fullWidth,
            'sm:w-[300px]': !fullWidth,
          })}
        >
          {country && (
            <img src={selectedCountry?.flag} alt={selectedCountry?.code} className="w-6" />
          )}
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          {countryKeys.map(ck => (
            <SelectItem key={ck} value={ck}>
              {data?.countries?.[ck]?.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowClear && <Button onClick={onClear}>Clear</Button>}
    </div>
  );
};

export default CountrySelector;
