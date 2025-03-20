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

export interface CountryStateSelectorProps {
  countryCode: CountryCode;
  onChangeCountryState: (v: string | null) => void;
  value?: string | null;
  allowClear?: boolean;
}

const CountryStateSelector: React.FC<CountryStateSelectorProps> = ({
  countryCode,
  onChangeCountryState,
  value,
  allowClear = true,
}) => {
  const [countryState, setCountryState] = React.useState<string | null>(value ?? null);
  const { data: data } = useCountryList();

  useEffect(() => setCountryState(value ?? null), [value]);

  const selectedCountryStates = useMemo(
    () => (countryCode ? (data?.countries[countryCode]?.states ?? []) : undefined),
    [data?.countries, countryCode],
  );

  const onChangeHandler = useCallback(
    (v: string) => {
      onChangeCountryState(v);
      setCountryState(v);
    },
    [onChangeCountryState],
  );

  const onClear = useCallback(() => {
    onChangeCountryState(null);
    setCountryState(null);
  }, [onChangeCountryState]);

  return (
    <div className="flex items-center gap-4">
      <Select value={countryState ?? undefined} onValueChange={onChangeHandler}>
        <SelectTrigger className="sm:w-[300px]">
          <SelectValue placeholder="Select a state / region" />
        </SelectTrigger>
        <SelectContent>
          {selectedCountryStates === undefined && <span>Loading...</span>}
          {selectedCountryStates?.length === 0 && <span>No states / regions for this country</span>}
          {selectedCountryStates?.map(s => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowClear && <Button onClick={onClear}>Clear</Button>}
    </div>
  );
};

export default CountryStateSelector;
