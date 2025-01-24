import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as React from 'react';
import { CurrencyCode } from '../../../../../server/db/lists.ts';
import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { useCurrencyList } from '@/api/useCurrencyList.ts';

export interface CurrencySelectorProps {
  onChangeCurrency: (v: CurrencyCode | null) => void;
  value?: CurrencyCode | null;
  allowClear?: boolean;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  onChangeCurrency,
  value,
  allowClear = true,
}) => {
  const [Currency, setCurrency] = React.useState<CurrencyCode | null>(value ?? null);
  const { data: data } = useCurrencyList();

  useEffect(() => setCurrency(value ?? null), [value]);

  const currencyKeys = useMemo(
    () =>
      (data?.currencies ? Object.keys(data.currencies) : []).sort((a, b) =>
        a.localeCompare(b),
      ) as CurrencyCode[],
    [data?.currencies],
  );

  const onChangeHandler = useCallback(
    (v: CurrencyCode) => {
      onChangeCurrency(v);
      setCurrency(v);
    },
    [onChangeCurrency],
  );

  const onClear = useCallback(() => {
    onChangeCurrency(null);
    setCurrency(null);
  }, [onChangeCurrency]);

  return (
    <div className="flex items-center gap-4">
      <Select value={Currency ?? undefined} onValueChange={onChangeHandler}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a currency" />
        </SelectTrigger>
        <SelectContent>
          {currencyKeys.map(ck => {
            const currency = data?.currencies?.[ck];
            if (!currency) return null;
            return (
              <SelectItem key={ck} value={ck}>
                {ck} [{currency.symbol}] - {currency.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {allowClear && <Button onClick={onClear}>Clear</Button>}
    </div>
  );
};

export default CurrencySelector;
